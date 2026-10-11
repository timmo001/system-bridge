//go:build linux

package cpu

import (
	"os"
	"path/filepath"
	"testing"
)

func writeHwmon(t *testing.T, root, dir string, files map[string]string) {
	t.Helper()
	hm := filepath.Join(root, dir)
	if err := os.MkdirAll(hm, 0o755); err != nil {
		t.Fatal(err)
	}
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(hm, name), []byte(content+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestReadCPUTemperaturePrefersCPUDriverOverEarlierSensor(t *testing.T) {
	// Layout from #4335: an unlabelled acpitz sensor comes before coretemp.
	root := t.TempDir()
	writeHwmon(t, root, "hwmon0", map[string]string{"name": "acpitz", "temp1_input": "16800"})
	writeHwmon(t, root, "hwmon1", map[string]string{"name": "nvme", "temp1_input": "48850", "temp1_label": "Composite"})
	writeHwmon(t, root, "hwmon2", map[string]string{
		"name":         "coretemp",
		"temp1_input":  "78000",
		"temp1_label":  "Package id 0",
		"temp2_input":  "71000",
		"temp2_label":  "Core 0",
		"temp10_input": "70000",
		"temp10_label": "Core 8",
	})

	got := readCPUTemperature(root)
	if got == nil || *got != 78 {
		t.Fatalf("got %v, want 78", got)
	}
}

func TestReadCPUTemperatureUsesUnlabelledCPUDriver(t *testing.T) {
	root := t.TempDir()
	writeHwmon(t, root, "hwmon0", map[string]string{"name": "acpitz", "temp1_input": "16800"})
	writeHwmon(t, root, "hwmon1", map[string]string{"name": "cpu_thermal", "temp1_input": "52000"})

	got := readCPUTemperature(root)
	if got == nil || *got != 52 {
		t.Fatalf("got %v, want 52", got)
	}
}

func TestReadCPUTemperatureFallsBackToFirstInput(t *testing.T) {
	root := t.TempDir()
	writeHwmon(t, root, "hwmon0", map[string]string{"name": "acpitz", "temp1_input": "16800"})
	writeHwmon(t, root, "hwmon1", map[string]string{"name": "nvme", "temp1_input": "48850", "temp1_label": "Composite"})

	got := readCPUTemperature(root)
	if got == nil || *got != 16.8 {
		t.Fatalf("got %v, want 16.8", got)
	}
}
