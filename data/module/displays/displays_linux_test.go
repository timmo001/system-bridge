//go:build linux

package displays

import (
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
)

// The base block of an AORUS FO32U2P's EDID
const aorusEDID = "00ffffffffffff001c541532010101011822010380462778ee0ad5af4e3e" +
	"b5240e5054bfef80714f81c08100814081809500a9c0b3004dd000a0f070" +
	"3e8030203500bb8b2100001a000000fd0030f01effea000a202020202020" +
	"000000fc00414f52555320464f3332553250565e00a0a0a0295030203500" +
	"4e4e2100001a0142"

func TestParseEDID(t *testing.T) {
	data, err := hex.DecodeString(aorusEDID)
	require.NoError(t, err)

	info, ok := parseEDID(data)
	require.True(t, ok)
	assert.Equal(t, edidInfo{
		Manufacturer:         "GBT",
		Model:                "AORUS FO32U2P",
		Width:                700,
		Height:               390,
		ResolutionHorizontal: 3840,
		ResolutionVertical:   2160,
	}, info)

	_, ok = parseEDID(data[:100])
	assert.False(t, ok)
}

func TestDRMDisplays(t *testing.T) {
	root := t.TempDir()
	edid, err := hex.DecodeString(aorusEDID)
	require.NoError(t, err)

	connector := func(name, status string, edid []byte) {
		dir := filepath.Join(root, name)
		require.NoError(t, os.MkdirAll(dir, 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(dir, "status"), []byte(status+"\n"), 0o644))
		require.NoError(t, os.WriteFile(filepath.Join(dir, "edid"), edid, 0o644))
	}
	connector("card1-HDMI-A-2", "connected", edid)
	connector("card1-DP-2", "disconnected", nil)
	connector("card1-DP-3", "connected", nil)
	require.NoError(t, os.MkdirAll(filepath.Join(root, "card1"), 0o755))

	displays, err := drmDisplays(root)
	require.NoError(t, err)
	require.Len(t, displays, 2)

	assert.Equal(t, "DP-3", displays[0].ID)
	assert.Equal(t, "DP-3", displays[0].Name)
	assert.Nil(t, displays[0].Width)

	assert.Equal(t, "HDMI-A-2", displays[1].ID)
	assert.Equal(t, "AORUS FO32U2P", displays[1].Name)
	assert.Equal(t, 3840, displays[1].ResolutionHorizontal)
	assert.Equal(t, 2160, displays[1].ResolutionVertical)
	require.NotNil(t, displays[1].Width)
	assert.Equal(t, 700, *displays[1].Width)
	assert.Nil(t, displays[1].X)
	assert.Nil(t, displays[1].RefreshRate)
}

func TestParseDetect(t *testing.T) {
	out := `Display 1
   I2C bus:          /dev/i2c-4
   DRM connector:    card1-DP-1
   drm_connector_id: 833
   Monitor:          SAM:LS28AG700N:H4ZRC00567

Display 2
   I2C bus:          /dev/i2c-5
   DRM connector:    card1-HDMI-A-2
   drm_connector_id: 837
   Monitor:          GBT:AORUS FO32U2P:
`
	assert.Equal(t, map[string]string{"DP-1": "4", "HDMI-A-2": "5"}, parseDetect(out))
}

func TestParseVCP(t *testing.T) {
	current, maximum, ok := parseBrightness("VCP 10 C 40 80\nVCP D6 SNC x04\n")
	require.True(t, ok)
	assert.Equal(t, 40.0, current)
	assert.Equal(t, 80.0, maximum)

	state := parsePowerState("VCP 10 C 40 80\nVCP D6 SNC x04\n")
	require.NotNil(t, state)
	assert.Equal(t, types.DisplayPowerStateOff, *state)

	_, _, ok = parseBrightness("VCP 10 ERR\nVCP D6 ERR\n")
	assert.False(t, ok)
	assert.Nil(t, parsePowerState("VCP 10 ERR\nVCP D6 ERR\n"))
}

func TestBacklightFor(t *testing.T) {
	root := t.TempDir()
	backlight := func(name, kind string) {
		dir := filepath.Join(root, name)
		require.NoError(t, os.MkdirAll(dir, 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(dir, "type"), []byte(kind+"\n"), 0o644))
	}
	backlight("acpi_video0", "firmware")
	backlight("intel_backlight", "raw")

	assert.Equal(t, "intel_backlight", backlightFor(root, "eDP-1"))
	assert.Equal(t, "", backlightFor(filepath.Join(root, "missing"), "eDP-1"))
}
