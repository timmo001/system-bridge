package prefab

import (
	"errors"
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolve(t *testing.T) {
	never := func() bool { return false }
	screenshot := Prefab{
		ID:   "screenshot",
		Name: "Screenshot",
		candidates: map[string][]candidate{
			"linux": {
				{program: "grim", arguments: []string{"{output}"}, when: never},
				{program: "gnome-screenshot", arguments: []string{"-f", "{output}"}},
				{program: "spectacle", arguments: []string{"-b", "{output}"}},
			},
		},
	}

	tests := []struct {
		name          string
		goos          string
		installed     []string
		wantCommand   string
		wantArguments []string
		wantErr       string
	}{
		{
			name:          "first installed candidate wins",
			goos:          "linux",
			installed:     []string{"gnome-screenshot", "spectacle"},
			wantCommand:   "/usr/bin/gnome-screenshot",
			wantArguments: []string{"-f", "{output}"},
		},
		{
			name:          "skips a candidate that doesn't apply, even when installed",
			goos:          "linux",
			installed:     []string{"grim", "spectacle"},
			wantCommand:   "/usr/bin/spectacle",
			wantArguments: []string{"-b", "{output}"},
		},
		{
			name:    "names the tools to install when none are",
			goos:    "linux",
			wantErr: "install gnome-screenshot or spectacle to use Screenshot",
		},
		{
			name:      "says when the platform has no candidates",
			goos:      "windows",
			installed: []string{"gnome-screenshot"},
			wantErr:   "Screenshot isn't available on this system",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub(t, tt.goos, tt.installed)

			command, arguments, err := screenshot.Resolve()

			if tt.wantErr != "" {
				require.EqualError(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantCommand, command)
			assert.Equal(t, tt.wantArguments, arguments)
		})
	}
}

func stub(t *testing.T, os string, installed []string) {
	t.Helper()
	originalGOOS, originalLookPath := goos, lookPath
	t.Cleanup(func() { goos, lookPath = originalGOOS, originalLookPath })

	goos = os
	lookPath = func(program string) (string, error) {
		if slices.Contains(installed, program) {
			return "/usr/bin/" + program, nil
		}
		return "", errors.New("not found")
	}
}
