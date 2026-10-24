//go:build linux

package battery

import (
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

const powerSupplyPath = "/sys/class/power_supply"

func readBatteries() []types.BatteryInfo {
	return readBatteriesFrom(powerSupplyPath)
}

func acConnected() *bool {
	return acConnectedFrom(powerSupplyPath)
}

func readBatteriesFrom(root string) []types.BatteryInfo {
	batteries := make([]types.BatteryInfo, 0)
	entries, err := os.ReadDir(root)
	if err != nil {
		slog.Debug("Power supplies unavailable", "error", err)
		return batteries
	}
	for _, entry := range entries {
		dir := filepath.Join(root, entry.Name())
		if readString(dir, "type") != "Battery" {
			continue
		}
		batteries = append(batteries, readBattery(dir, entry.Name()))
	}
	return batteries
}

func readBattery(dir, name string) types.BatteryInfo {
	info := types.BatteryInfo{
		Name:  name,
		Scope: types.BatteryScopeSystem,
		State: parseState(readString(dir, "status")),
	}
	// Laptop batteries often have no scope file, so only a "Device" scope
	// marks a peripheral
	if readString(dir, "scope") == "Device" {
		info.Scope = types.BatteryScopeDevice
	}
	if model := readString(dir, "model_name"); model != "" {
		info.Model = &model
	}

	voltage, hasVoltage := readMicro(dir, "voltage_now")
	if hasVoltage && voltage > 0 {
		info.Voltage = &voltage
	}

	// Drivers report either energy (µWh and µW) or charge (µAh and µA)
	now, hasNow := readMicro(dir, "energy_now")
	full, hasFull := readMicro(dir, "energy_full")
	rate, hasRate := readMicro(dir, "power_now")
	if !hasNow {
		now, hasNow = readMicro(dir, "charge_now")
		full, hasFull = readMicro(dir, "charge_full")
		rate, hasRate = readMicro(dir, "current_now")
		if hasRate && hasVoltage {
			power := math.Abs(rate) * voltage
			info.Power = &power
		}
	} else if hasRate {
		power := math.Abs(rate)
		info.Power = &power
	}
	rate = math.Abs(rate)

	if hasNow && hasFull && full > 0 {
		percentage := math.Min(now/full*100, 100)
		info.Percentage = &percentage
	} else if capacity, err := strconv.ParseFloat(readString(dir, "capacity"), 64); err == nil {
		info.Percentage = &capacity
	}

	info.TimeRemaining = kernelTimeRemaining(dir, info.State)
	if info.TimeRemaining == nil && hasNow && hasRate {
		info.TimeRemaining = timeRemaining(info.State, now, full, rate)
	}

	return info
}

// kernelTimeRemaining reads the driver's own estimate, where it gives one
func kernelTimeRemaining(dir string, state types.BatteryState) *float64 {
	var file string
	switch state {
	case types.BatteryStateCharging:
		file = "time_to_full_now"
	case types.BatteryStateDischarging:
		file = "time_to_empty_now"
	default:
		return nil
	}
	seconds, err := strconv.ParseFloat(readString(dir, file), 64)
	if err != nil || seconds <= 0 {
		return nil
	}
	return &seconds
}

// acConnectedFrom reports whether any mains or USB power supply is online. It
// is nil when there are none to read, as on most desktops.
func acConnectedFrom(root string) *bool {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil
	}
	var connected *bool
	for _, entry := range entries {
		dir := filepath.Join(root, entry.Name())
		supplyType := readString(dir, "type")
		if supplyType == "" || supplyType == "Battery" || readString(dir, "scope") == "Device" {
			continue
		}
		online := readString(dir, "online")
		if online == "" {
			continue
		}
		// USB supplies can report 2 for a programmable charger
		isOnline := online != "0"
		if connected == nil || isOnline {
			connected = &isOnline
		}
	}
	return connected
}

func parseState(status string) types.BatteryState {
	switch status {
	case "Charging":
		return types.BatteryStateCharging
	case "Discharging":
		return types.BatteryStateDischarging
	case "Full":
		return types.BatteryStateFull
	case "Not charging":
		return types.BatteryStateNotCharging
	case "Empty":
		return types.BatteryStateEmpty
	default:
		return types.BatteryStateUnknown
	}
}

func readString(dir, file string) string {
	data, err := os.ReadFile(filepath.Join(dir, file))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// readMicro reads a sysfs value in micro units, such as µV, and returns it in
// whole units
func readMicro(dir, file string) (float64, bool) {
	value, err := strconv.ParseFloat(readString(dir, file), 64)
	if err != nil {
		return 0, false
	}
	return value / 1e6, true
}
