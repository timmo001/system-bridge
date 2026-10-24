//go:build linux

package battery

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/timmo001/system-bridge/types"
)

func writeSupply(t *testing.T, root, name string, files map[string]string) {
	t.Helper()
	dir := filepath.Join(root, name)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	for file, value := range files {
		if err := os.WriteFile(filepath.Join(dir, file), []byte(value+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestReadBatteriesFrom(t *testing.T) {
	root := t.TempDir()
	writeSupply(t, root, "AC", map[string]string{"type": "Mains", "online": "1"})
	writeSupply(t, root, "BAT0", map[string]string{
		"type":        "Battery",
		"status":      "Discharging",
		"model_name":  "5B10W13930",
		"energy_now":  "30000000",
		"energy_full": "60000000",
		"power_now":   "-15000000",
		"voltage_now": "12000000",
	})
	writeSupply(t, root, "BAT1", map[string]string{
		"type":        "Battery",
		"status":      "Charging",
		"charge_now":  "1000000",
		"charge_full": "4000000",
		"current_now": "1500000",
		"voltage_now": "8000000",
	})
	writeSupply(t, root, "hidpp_battery_1", map[string]string{
		"type":     "Battery",
		"scope":    "Device",
		"status":   "Not charging",
		"capacity": "96",
	})

	batteries := readBatteriesFrom(root)
	if len(batteries) != 3 {
		t.Fatalf("got %d batteries, want 3", len(batteries))
	}

	bat0 := batteries[0]
	if bat0.State != types.BatteryStateDischarging || bat0.Scope != types.BatteryScopeSystem {
		t.Errorf("BAT0 state %q scope %q", bat0.State, bat0.Scope)
	}
	assertFloat(t, "BAT0 percentage", bat0.Percentage, 50)
	assertFloat(t, "BAT0 power", bat0.Power, 15)
	assertFloat(t, "BAT0 voltage", bat0.Voltage, 12)
	assertFloat(t, "BAT0 time remaining", bat0.TimeRemaining, 7200)

	bat1 := batteries[1]
	assertFloat(t, "BAT1 percentage", bat1.Percentage, 25)
	assertFloat(t, "BAT1 power", bat1.Power, 12)
	assertFloat(t, "BAT1 time remaining", bat1.TimeRemaining, 7200)

	mouse := batteries[2]
	if mouse.Scope != types.BatteryScopeDevice || mouse.State != types.BatteryStateNotCharging {
		t.Errorf("mouse state %q scope %q", mouse.State, mouse.Scope)
	}
	assertFloat(t, "mouse percentage", mouse.Percentage, 96)
	if mouse.Power != nil || mouse.TimeRemaining != nil {
		t.Errorf("mouse power %v time remaining %v, want nil", mouse.Power, mouse.TimeRemaining)
	}

	if connected := acConnectedFrom(root); connected == nil || !*connected {
		t.Errorf("acConnectedFrom = %v, want true", connected)
	}
}

func TestACConnectedFrom(t *testing.T) {
	root := t.TempDir()
	if connected := acConnectedFrom(root); connected != nil {
		t.Errorf("no supplies: got %v, want nil", *connected)
	}

	writeSupply(t, root, "ucsi-source-psy-USBC000:001", map[string]string{"type": "USB", "online": "0"})
	writeSupply(t, root, "ADP1", map[string]string{"type": "Mains", "online": "0"})
	if connected := acConnectedFrom(root); connected == nil || *connected {
		t.Errorf("all offline: got %v, want false", connected)
	}

	writeSupply(t, root, "ucsi-source-psy-USBC000:002", map[string]string{"type": "USB", "online": "1"})
	if connected := acConnectedFrom(root); connected == nil || !*connected {
		t.Errorf("one online: got %v, want true", connected)
	}
}

func assertFloat(t *testing.T, name string, got *float64, want float64) {
	t.Helper()
	if got == nil {
		t.Errorf("%s = nil, want %v", name, want)
		return
	}
	if diff := *got - want; diff > 1e-6 || diff < -1e-6 {
		t.Errorf("%s = %v, want %v", name, *got, want)
	}
}
