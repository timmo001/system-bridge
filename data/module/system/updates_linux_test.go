//go:build linux

package system

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/timmo001/system-bridge/types"
)

func TestParseCheckupdates(t *testing.T) {
	out := "linux 6.11.5.arch1-1 -> 6.11.6.arch1-1\nmesa 1:24.2.5-1 -> 1:24.2.6-1\n==> ERROR: something\n"
	assert.Equal(t, []types.SystemPackageUpdate{
		{Name: "linux", Version: "6.11.6.arch1-1", CurrentVersion: pointerTo("6.11.5.arch1-1")},
		{Name: "mesa", Version: "1:24.2.6-1", CurrentVersion: pointerTo("1:24.2.5-1")},
	}, parseCheckupdates([]byte(out)))
}

func TestParseAptUpgradable(t *testing.T) {
	out := "Listing...\n" +
		"curl/noble-updates,noble-security 8.5.0-2ubuntu10.5 amd64 [upgradable from: 8.5.0-2ubuntu10.4]\n" +
		"libcurl4t64/noble-updates 8.5.0-2ubuntu10.5 amd64 [upgradable from: 8.5.0-2ubuntu10.4]\n"
	assert.Equal(t, []types.SystemPackageUpdate{
		{Name: "curl", Version: "8.5.0-2ubuntu10.5", CurrentVersion: pointerTo("8.5.0-2ubuntu10.4")},
		{Name: "libcurl4t64", Version: "8.5.0-2ubuntu10.5", CurrentVersion: pointerTo("8.5.0-2ubuntu10.4")},
	}, parseAptUpgradable([]byte(out)))
}

func TestParseDnfCheckUpdate(t *testing.T) {
	out := "\nkernel.x86_64    6.11.6-300.fc41    updates\nvim-common.x86_64 2:9.1.825-1.fc41 updates\n" +
		"Obsoleting Packages\nold.noarch 1.0-1.fc41 updates\n"
	assert.Equal(t, []types.SystemPackageUpdate{
		{Name: "kernel", Version: "6.11.6-300.fc41"},
		{Name: "vim-common", Version: "2:9.1.825-1.fc41"},
	}, parseDnfCheckUpdate([]byte(out)))
}
