package confirmation

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestDesktopConfirmation(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("uses a fake Linux dialog command")
	}
	for _, test := range []struct {
		name               string
		exit               int
		confirmed, wantErr bool
	}{
		{"confirm", 0, true, false},
		{"cancel", 1, false, false},
		{"dialog failure", 2, false, true},
	} {
		t.Run(test.name, func(t *testing.T) {
			dir := t.TempDir()
			script := fmt.Sprintf("#!/bin/sh\nexit %d\n", test.exit)
			if err := os.WriteFile(filepath.Join(dir, "zenity"), []byte(script), 0700); err != nil {
				t.Fatal(err)
			}
			t.Setenv("PATH", dir)
			confirmed, err := Ask(context.Background(), "Quit", QuitMessage)
			if confirmed != test.confirmed || (err != nil) != test.wantErr {
				t.Fatalf("got confirmed=%v err=%v", confirmed, err)
			}
		})
	}
	t.Run("missing dialog", func(t *testing.T) {
		t.Setenv("PATH", t.TempDir())
		confirmed, err := Ask(context.Background(), "Quit", QuitMessage)
		if confirmed || err == nil {
			t.Fatalf("missing dialog must not confirm: confirmed=%v err=%v", confirmed, err)
		}
	})
}
