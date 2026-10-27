//go:build linux

package system

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"time"

	"github.com/godbus/dbus/v5"
)

const powerProfilesTimeout = 2 * time.Second

// powerProfilesService is where power-profiles-daemon, or tuned-ppd, answers.
// Since 0.20 it's on the UPower name; older daemons only have the first one.
type powerProfilesService struct {
	name string
	path dbus.ObjectPath
}

var powerProfilesServices = []powerProfilesService{
	{name: "org.freedesktop.UPower.PowerProfiles", path: "/org/freedesktop/UPower/PowerProfiles"},
	{name: "net.hadess.PowerProfiles", path: "/net/hadess/PowerProfiles"},
}

// readPowerProfiles reads the active profile and the ones available from
// whichever service answers
func readPowerProfiles(ctx context.Context, conn *dbus.Conn) (powerProfilesService, string, []string, error) {
	var errs []error
	for _, service := range powerProfilesServices {
		var properties map[string]dbus.Variant
		err := conn.Object(service.name, service.path).
			CallWithContext(ctx, "org.freedesktop.DBus.Properties.GetAll", 0, service.name).
			Store(&properties)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		active, _ := properties["ActiveProfile"].Value().(string)
		listed, _ := properties["Profiles"].Value().([]map[string]dbus.Variant)
		profiles := make([]string, 0, len(listed))
		for _, profile := range listed {
			if name, ok := profile["Profile"].Value().(string); ok {
				profiles = append(profiles, name)
			}
		}
		return service, active, profiles, nil
	}
	return powerProfilesService{}, "", nil, errors.Join(errs...)
}

// GetPowerProfile returns the active power profile, such as balanced, and the
// ones available. The profile is nil, and the list empty, without
// power-profiles-daemon.
func GetPowerProfile(ctx context.Context) (*string, []string) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		slog.Debug("Failed to connect to the system bus", "error", err)
		return nil, []string{}
	}
	defer func() { _ = conn.Close() }()

	ctx, cancel := context.WithTimeout(ctx, powerProfilesTimeout)
	defer cancel()

	_, active, profiles, err := readPowerProfiles(ctx, conn)
	if err != nil || active == "" {
		slog.Debug("Failed to read the power profile", "error", err)
		return nil, []string{}
	}
	return &active, profiles
}

// SetPowerProfile switches to one of the available power profiles
func SetPowerProfile(ctx context.Context, profile string) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return fmt.Errorf("connect to the system bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	ctx, cancel := context.WithTimeout(ctx, powerProfilesTimeout)
	defer cancel()

	service, _, profiles, err := readPowerProfiles(ctx, conn)
	if err != nil {
		return fmt.Errorf("power-profiles-daemon isn't running: %w", err)
	}
	if !slices.Contains(profiles, profile) {
		return fmt.Errorf("%q isn't a power profile here; choose from %v", profile, profiles)
	}
	if err := conn.Object(service.name, service.path).
		CallWithContext(ctx, "org.freedesktop.DBus.Properties.Set", 0, service.name, "ActiveProfile", dbus.MakeVariant(profile)).
		Err; err != nil {
		return fmt.Errorf("set the power profile: %w", err)
	}
	return nil
}
