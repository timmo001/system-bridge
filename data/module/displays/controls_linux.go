//go:build linux

package displays

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/godbus/dbus/v5"
	"github.com/timmo001/system-bridge/data/module/desktop"
	"github.com/timmo001/system-bridge/types"
)

const backlightPath = "/sys/class/backlight"

// ddcTimeout bounds each ddcutil call. A monitor that doesn't answer makes
// ddcutil retry, and the displays module shouldn't wait on it.
const ddcTimeout = 5 * time.Second

// Built-in panels use the kernel backlight, never DDC/CI
func isInternal(connector string) bool {
	for _, prefix := range []string{"eDP-", "LVDS-", "DSI-"} {
		if strings.HasPrefix(connector, prefix) {
			return true
		}
	}
	return false
}

// addControls reads the brightness and power state of each display: from the
// backlight for a built-in panel, and over DDC/CI for an external monitor.
func addControls(ctx context.Context, displays []types.Display) {
	var buses map[string]string
	for i := range displays {
		display := &displays[i]
		if isInternal(display.ID) {
			if device := backlightFor(backlightPath, display.ID); device != "" {
				display.Brightness = readBacklight(filepath.Join(backlightPath, device))
			}
			continue
		}

		if buses == nil {
			buses = ddcBuses(ctx)
		}
		if bus, ok := buses[display.ID]; ok {
			display.Brightness, display.PowerState = readVCP(ctx, bus)
		}
	}

	// Hyprland knows whether each display is on, for those DDC/CI can't read
	if states, err := desktop.HyprlandDPMS(ctx); err == nil {
		for i := range displays {
			on, ok := states[displays[i].ID]
			if !ok || displays[i].PowerState != nil {
				continue
			}
			state := types.DisplayPowerStateOff
			if on {
				state = types.DisplayPowerStateOn
			}
			displays[i].PowerState = &state
		}
	}
}

// SetBrightness sets a display's brightness, in percent
func SetBrightness(ctx context.Context, id string, brightness float64) error {
	if isInternal(id) {
		device := backlightFor(backlightPath, id)
		if device == "" {
			return fmt.Errorf("%w: no backlight for %s", ErrUnsupported, id)
		}
		maximum, err := strconv.ParseFloat(readString(filepath.Join(backlightPath, device), "max_brightness"), 64)
		if err != nil || maximum <= 0 {
			return fmt.Errorf("failed to read the maximum brightness of %s: %v", device, err)
		}
		return setBacklight(device, uint32(math.Round(brightness/100*maximum)))
	}

	bus, err := ddcBus(ctx, id)
	if err != nil {
		return err
	}
	out, err := ddcutil(ctx, "--bus", bus, "getvcp", "10", "--brief")
	_, maximum, ok := parseBrightness(out)
	if !ok {
		return fmt.Errorf("failed to read the brightness range of %s: %v", id, err)
	}
	raw := int(math.Round(brightness / 100 * maximum))
	if _, err := ddcutil(ctx, "--bus", bus, "--noverify", "setvcp", "10", strconv.Itoa(raw)); err != nil {
		return fmt.Errorf("failed to set the brightness of %s: %v", id, err)
	}
	return nil
}

// SetPowerState sets a monitor's power mode over DDC/CI. Without DDC/CI, such
// as on a built-in panel, Hyprland turns the display on or off instead, as it
// has no standby or suspend.
func SetPowerState(ctx context.Context, id string, state types.DisplayPowerState) error {
	value, ok := powerStateValues[state]
	if !ok {
		return fmt.Errorf("unknown power state %q", state)
	}
	bus, err := "", fmt.Errorf("%w: %s is a built-in panel", ErrUnsupported, id)
	if !isInternal(id) {
		bus, err = ddcBus(ctx, id)
	}
	if errors.Is(err, ErrUnsupported) {
		hyprlandErr := desktop.HyprlandSetDPMS(ctx, id, state == types.DisplayPowerStateOn)
		if hyprlandErr == nil || !errors.Is(hyprlandErr, desktop.ErrUnsupported) {
			return hyprlandErr
		}
		return err
	}
	if err != nil {
		return err
	}
	if _, err := ddcutil(ctx, "--bus", bus, "--noverify", "setvcp", "D6", strconv.Itoa(value)); err != nil {
		return fmt.Errorf("failed to set the power state of %s: %v", id, err)
	}
	return nil
}

func ddcBus(ctx context.Context, id string) (string, error) {
	bus, ok := ddcBuses(ctx)[id]
	if !ok {
		return "", fmt.Errorf("%w: no DDC/CI monitor on %s", ErrUnsupported, id)
	}
	return bus, nil
}

// ddcBuses maps each DRM connector, such as HDMI-A-2, to the I2C bus number
// of the monitor on it
func ddcBuses(ctx context.Context) map[string]string {
	buses := make(map[string]string)
	if _, err := exec.LookPath("ddcutil"); err != nil {
		slog.Debug("ddcutil not installed, skipping DDC/CI")
		return buses
	}
	out, err := ddcutil(ctx, "detect", "--brief")
	if err != nil {
		slog.Debug("ddcutil detect failed", "error", err)
	}
	return parseDetect(out)
}

func parseDetect(out string) map[string]string {
	buses := make(map[string]string)
	var bus string
	scanner := bufio.NewScanner(strings.NewReader(out))
	for scanner.Scan() {
		key, value, ok := strings.Cut(strings.TrimSpace(scanner.Text()), ":")
		if !ok {
			continue
		}
		value = strings.TrimSpace(value)
		switch key {
		case "I2C bus":
			bus = strings.TrimPrefix(value, "/dev/i2c-")
		case "DRM connector":
			if match := drmConnectorPattern.FindStringSubmatch(value); match != nil && bus != "" {
				buses[match[1]] = bus
			}
			bus = ""
		}
	}
	return buses
}

// readVCP reads brightness (VCP 10) and power mode (VCP D6) in one call. A
// monitor can support one without the other.
func readVCP(ctx context.Context, bus string) (*float64, *types.DisplayPowerState) {
	// ddcutil exits non-zero when any feature fails, but still prints the
	// others
	out, err := ddcutil(ctx, "--bus", bus, "getvcp", "10", "D6", "--brief")
	var brightness *float64
	if current, maximum, ok := parseBrightness(out); ok && maximum > 0 {
		percent := current / maximum * 100
		brightness = &percent
	}
	state := parsePowerState(out)
	if brightness == nil && state == nil {
		slog.Debug("DDC/CI unavailable", "bus", bus, "error", err)
	}
	return brightness, state
}

// parseBrightness reads a line like "VCP 10 C 50 100"
func parseBrightness(out string) (current, maximum float64, ok bool) {
	for line := range strings.Lines(out) {
		fields := strings.Fields(line)
		if len(fields) != 5 || fields[0] != "VCP" || fields[1] != "10" || fields[2] != "C" {
			continue
		}
		current, errCurrent := strconv.ParseFloat(fields[3], 64)
		maximum, errMaximum := strconv.ParseFloat(fields[4], 64)
		return current, maximum, errCurrent == nil && errMaximum == nil
	}
	return 0, 0, false
}

// parsePowerState reads a line like "VCP D6 SNC x01"
func parsePowerState(out string) *types.DisplayPowerState {
	for line := range strings.Lines(out) {
		fields := strings.Fields(line)
		if len(fields) != 4 || fields[0] != "VCP" || !strings.EqualFold(fields[1], "D6") || fields[2] != "SNC" {
			continue
		}
		value, err := strconv.ParseInt(strings.TrimPrefix(fields[3], "x"), 16, 64)
		if err != nil {
			return nil
		}
		return powerState(int(value))
	}
	return nil
}

func ddcutil(ctx context.Context, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, ddcTimeout)
	defer cancel()
	out, err := exec.CommandContext(ctx, "ddcutil", append([]string{"--skip-ddc-checks"}, args...)...).Output()
	if err != nil {
		if lines := strings.Split(strings.TrimSpace(string(out)), "\n"); lines[len(lines)-1] != "" {
			return string(out), fmt.Errorf("%w: %s", err, lines[len(lines)-1])
		}
	}
	return string(out), err
}

// backlightFor finds the backlight of a built-in panel. GPU backlights link
// to their connector; firmware and platform ones don't, so a panel without a
// linked backlight takes the best of those.
func backlightFor(root, connector string) string {
	entries, err := os.ReadDir(root)
	if err != nil {
		return ""
	}
	best, bestRank := "", 0
	for _, entry := range entries {
		dir := filepath.Join(root, entry.Name())
		if target, err := filepath.EvalSymlinks(filepath.Join(dir, "device")); err == nil {
			if match := drmConnectorPattern.FindStringSubmatch(filepath.Base(target)); match != nil {
				if match[1] == connector {
					return entry.Name()
				}
				continue
			}
		}
		rank := map[string]int{"firmware": 1, "platform": 2, "raw": 3}[readString(dir, "type")]
		if rank > bestRank {
			best, bestRank = entry.Name(), rank
		}
	}
	return best
}

func readBacklight(dir string) *float64 {
	current, err := strconv.ParseFloat(readString(dir, "actual_brightness"), 64)
	if err != nil {
		current, err = strconv.ParseFloat(readString(dir, "brightness"), 64)
	}
	maximum, errMaximum := strconv.ParseFloat(readString(dir, "max_brightness"), 64)
	if err != nil || errMaximum != nil || maximum <= 0 {
		return nil
	}
	percent := current / maximum * 100
	return &percent
}

// setBacklight writes the backlight through logind, which lets the user of an
// active session set it without root
func setBacklight(device string, value uint32) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return fmt.Errorf("failed to connect to the system bus: %v", err)
	}
	defer func() {
		if err := conn.Close(); err != nil {
			slog.Debug("Failed to close the system bus", "error", err)
		}
	}()

	session, err := userSession(conn)
	if err != nil {
		return err
	}
	call := conn.Object("org.freedesktop.login1", session).
		Call("org.freedesktop.login1.Session.SetBrightness", 0, "backlight", device, value)
	if call.Err != nil {
		return fmt.Errorf("failed to set the backlight of %s: %v", device, call.Err)
	}
	return nil
}

// userSession is the caller's own session, or the user's graphical session
// when the backend runs as a user service outside one
func userSession(conn *dbus.Conn) (dbus.ObjectPath, error) {
	const login1 = "org.freedesktop.login1"
	var path dbus.ObjectPath
	if err := conn.Object(login1, "/org/freedesktop/login1").
		Call("org.freedesktop.login1.Manager.GetSessionByPID", 0, uint32(os.Getpid())).Store(&path); err == nil {
		return path, nil
	}

	variant, err := conn.Object(login1, "/org/freedesktop/login1/user/self").
		GetProperty("org.freedesktop.login1.User.Display")
	if err != nil {
		return "", fmt.Errorf("failed to find a login session: %v", err)
	}
	// A (session ID, object path) pair
	if display, ok := variant.Value().([]any); ok && len(display) == 2 {
		if path, ok := display[1].(dbus.ObjectPath); ok && path != "/" {
			return path, nil
		}
	}
	return "", fmt.Errorf("failed to find a login session")
}
