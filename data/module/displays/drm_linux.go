//go:build linux

package displays

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

const drmPath = "/sys/class/drm"

// Connector directories are named for their card, such as card1-HDMI-A-2
var drmConnectorPattern = regexp.MustCompile(`^card\d+-(.+)$`)

// drmDisplays lists the monitors connected to each DRM connector. The kernel
// doesn't know where the compositor placed them or which mode it set, so
// position, refresh rate and pixel clock are left unset, and the resolution is
// the monitor's preferred one.
func drmDisplays(root string) ([]types.Display, error) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, fmt.Errorf("failed to read DRM connectors: %v", err)
	}

	displays := make([]types.Display, 0)
	for _, entry := range entries {
		match := drmConnectorPattern.FindStringSubmatch(entry.Name())
		if match == nil {
			continue
		}
		dir := filepath.Join(root, entry.Name())
		if readString(dir, "status") != "connected" {
			continue
		}

		connector := match[1]
		display := types.Display{ID: connector, Name: connector}
		if data, err := os.ReadFile(filepath.Join(dir, "edid")); err == nil {
			if info, ok := parseEDID(data); ok {
				if info.Model != "" {
					display.Name = info.Model
				}
				display.ResolutionHorizontal = info.ResolutionHorizontal
				display.ResolutionVertical = info.ResolutionVertical
				if info.Width > 0 && info.Height > 0 {
					display.Width = &info.Width
					display.Height = &info.Height
				}
			}
		}
		displays = append(displays, display)
	}
	return displays, nil
}

func readString(dir, file string) string {
	data, err := os.ReadFile(filepath.Join(dir, file))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}
