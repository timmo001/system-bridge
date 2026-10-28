//go:build linux

package powercap

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func writeZone(t *testing.T, dir string, files map[string]string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestZonePath(t *testing.T) {
	root := t.TempDir()
	writeZone(t, filepath.Join(root, "intel-rapl:0"), map[string]string{"name": "package-0"})
	writeZone(t, filepath.Join(root, "intel-rapl:0:1"), map[string]string{"name": "uncore"})
	writeZone(t, filepath.Join(root, "intel-rapl:1"), map[string]string{"name": "psys"})

	if got := zonePath(root, "psys"); got != filepath.Join(root, "intel-rapl:1") {
		t.Fatalf("psys: got %q", got)
	}
	if got := zonePath(root, "uncore"); got != filepath.Join(root, "intel-rapl:0:1") {
		t.Fatalf("uncore: got %q", got)
	}
	if got := zonePath(root, "dram"); got != "" {
		t.Fatalf("dram: got %q, want none", got)
	}
}

func TestWatts(t *testing.T) {
	zone := filepath.Join(t.TempDir(), "intel-rapl:1")
	start := time.Now()

	writeZone(t, zone, map[string]string{"energy_uj": "1000000", "max_energy_range_uj": "10000000"})
	if got := watts(zone, start); got != nil {
		t.Fatalf("first call: got %v, want nil", *got)
	}

	writeZone(t, zone, map[string]string{"energy_uj": "6000000"})
	if got := watts(zone, start.Add(time.Second)); got == nil || *got != 5 {
		t.Fatalf("got %v, want 5", got)
	}

	// Wraps from 6 J past the 10 J range to 1 J: 5 J over 2 s
	writeZone(t, zone, map[string]string{"energy_uj": "1000000"})
	if got := watts(zone, start.Add(3*time.Second)); got == nil || *got != 2.5 {
		t.Fatalf("after wrap: got %v, want 2.5", got)
	}
}

func TestWattsUnreadable(t *testing.T) {
	if got := watts(filepath.Join(t.TempDir(), "missing"), time.Now()); got != nil {
		t.Fatalf("got %v, want nil", *got)
	}
	if got := watts("", time.Now()); got != nil {
		t.Fatalf("got %v, want nil", *got)
	}
}
