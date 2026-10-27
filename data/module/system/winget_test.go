package system

import (
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/timmo001/system-bridge/types"
)

func TestWingetUpdates(t *testing.T) {
	// A progress spinner, then the table, with its columns padded as winget
	// pads them, and its summary line
	row := func(name, id, version, available, source string) string {
		return fmt.Sprintf("%-19s %-27s %-13s %-14s %s\r\n", name, id, version, available, source)
	}
	out := "\r   - \r   \\ \r" +
		row("Name", "Id", "Version", "Available", "Source") +
		strings.Repeat("-", 82) + "\r\n" +
		row("Microsoft Edge", "Microsoft.Edge", "130.0.2849.5", "130.0.2849.68", "winget") +
		row("Visual Studio Code", "Microsoft.VisualStudioCode", "1.94.0", "1.95.1", "winget") +
		"2 upgrades available.\r\n"

	updates, found := wingetUpdates([]byte(out))
	require.True(t, found)
	assert.Equal(t, []types.SystemPackageUpdate{
		{Name: "Microsoft Edge", Version: "130.0.2849.68", CurrentVersion: pointerTo("130.0.2849.5")},
		{Name: "Visual Studio Code", Version: "1.95.1", CurrentVersion: pointerTo("1.94.0")},
	}, updates)

	_, found = wingetUpdates([]byte("No installed package found matching input criteria.\r\n"))
	assert.False(t, found)
}

func TestWingetUpdatesTranslated(t *testing.T) {
	out := "Nom          ID             Version Disponible Source\n" +
		"----------------------------------------------------\n" +
		"Git          Git.Git        2.46.0  2.47.0     winget\n" +
		"1 mises à niveau disponibles.\n"

	updates, found := wingetUpdates([]byte(out))
	require.True(t, found)
	assert.Equal(t, []types.SystemPackageUpdate{
		{Name: "Git", Version: "2.47.0", CurrentVersion: pointerTo("2.46.0")},
	}, updates)
}

func pointerTo(value string) *string { return &value }
