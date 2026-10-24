//go:build linux

package system

import (
	"cmp"
	"log/slog"
	"slices"
	"strings"
	"time"

	"github.com/godbus/dbus/v5"

	"github.com/timmo001/system-bridge/types"
)

const systemd1 = "org.freedesktop.systemd1"

// unitScope is a systemd manager: the system's on the system bus, or the
// user's on their session bus
type unitScope struct {
	name    string
	connect func(...dbus.ConnOption) (*dbus.Conn, error)
}

var unitScopes = []unitScope{
	{name: "system", connect: dbus.ConnectSystemBus},
	{name: "user", connect: dbus.ConnectSessionBus},
}

// listedUnit is a unit as systemd's ListUnitsFiltered returns it
type listedUnit struct {
	Name        string
	Description string
	LoadState   string
	ActiveState string
	SubState    string
	Following   string
	Path        dbus.ObjectPath
	JobID       uint32
	JobType     string
	JobPath     dbus.ObjectPath
}

// GetFailedUnits returns the failed system and user units, or nil when
// neither systemd manager can be reached
func GetFailedUnits() *[]types.SystemFailedUnit {
	units := []types.SystemFailedUnit{}
	reached := false
	for _, scope := range unitScopes {
		conn, err := scope.connect()
		if err != nil {
			slog.Debug("Failed to connect to systemd", "scope", scope.name, "error", err)
			continue
		}
		failed, err := listFailedUnits(conn)
		if err != nil {
			slog.Debug("Failed to list failed units", "scope", scope.name, "error", err)
		} else {
			reached = true
			for _, unit := range failed {
				units = append(units, failedUnit(conn, scope.name, unit))
			}
		}
		if err := conn.Close(); err != nil {
			slog.Debug("Failed to close the bus", "scope", scope.name, "error", err)
		}
	}
	if !reached {
		return nil
	}
	slices.SortStableFunc(units, func(a, b types.SystemFailedUnit) int {
		return cmp.Or(cmp.Compare(a.Scope, b.Scope), cmp.Compare(a.Name, b.Name))
	})
	return &units
}

func listFailedUnits(conn *dbus.Conn) ([]listedUnit, error) {
	var units []listedUnit
	err := conn.Object(systemd1, "/org/freedesktop/systemd1").
		Call(systemd1+".Manager.ListUnitsFiltered", 0, []string{"failed"}).Store(&units)
	return units, err
}

// failedUnit adds why and when a unit failed, where systemd reports them
func failedUnit(conn *dbus.Conn, scope string, unit listedUnit) types.SystemFailedUnit {
	failed := types.SystemFailedUnit{
		Name:        unit.Name,
		Description: unit.Description,
		Scope:       scope,
		LoadState:   unit.LoadState,
	}
	object := conn.Object(systemd1, unit.Path)
	if variant, err := object.GetProperty(systemd1 + ".Unit.StateChangeTimestamp"); err == nil {
		if micros, ok := variant.Value().(uint64); ok && micros > 0 {
			since := time.UnixMicro(int64(micros)).Unix()
			failed.Since = &since
		}
	}
	// Units of most types, such as services, timers and mounts, say why they
	// failed in their type's own interface
	if dot := strings.LastIndex(unit.Name, "."); dot >= 0 {
		unitType := unit.Name[dot+1:]
		if unitType != "" {
			iface := systemd1 + "." + strings.ToUpper(unitType[:1]) + unitType[1:]
			if variant, err := object.GetProperty(iface + ".Result"); err == nil {
				if result, ok := variant.Value().(string); ok && result != "" {
					failed.Result = &result
				}
			}
		}
	}
	return failed
}
