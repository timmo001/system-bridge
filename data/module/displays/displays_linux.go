//go:build linux
// +build linux

package displays

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/jezek/xgb"
	"github.com/jezek/xgb/randr"
	"github.com/jezek/xgb/xproto"
	"github.com/timmo001/system-bridge/types"
)

func GetDisplays() ([]types.Display, error) {
	displays := make([]types.Display, 0)
	var primaryDisplay *types.Display

	// Connect to X server
	X, err := xgb.NewConn()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to X server: %v", err)
	}
	defer X.Close()

	// Initialize RandR
	err = randr.Init(X)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize RandR: %v", err)
	}

	// Get the root window
	root := xproto.Setup(X).DefaultScreen(X).Root

	// Get screen resources
	resources, err := randr.GetScreenResources(X, root).Reply()
	if err != nil {
		return nil, fmt.Errorf("failed to get screen resources: %v", err)
	}

	// Get primary output
	primary, err := randr.GetOutputPrimary(X, root).Reply()
	if err != nil {
		log.Error("failed to get primary output", "error", err)
	}

	// Iterate through outputs
	for _, output := range resources.Outputs {
		info, err := randr.GetOutputInfo(X, output, 0).Reply()
		if err != nil {
			log.Error("failed to get output info", "error", err)
			continue
		}

		if info.Connection != randr.ConnectionConnected {
			continue
		}

		// Get current mode info
		mode := resources.Modes[0]
		for _, modeID := range info.Modes {
			for _, m := range resources.Modes {
				if m.Id == uint32(modeID) {
					mode = m
					break
				}
			}
		}

		// Get crtc info for position and resolution
		var x, y int16
		var resolutionWidth, resolutionHeight uint16
		if info.Crtc != 0 {
			crtc, err := randr.GetCrtcInfo(X, info.Crtc, 0).Reply()
			if err == nil {
				x = crtc.X
				y = crtc.Y
				resolutionWidth = crtc.Width
				resolutionHeight = crtc.Height
			}
		}

		// Calculate refresh rate
		refreshRate := float64(mode.DotClock) / (float64(mode.Htotal) * float64(mode.Vtotal))

		// Convert name from []byte to string
		name := string(info.Name)

		id := strings.ReplaceAll(name, " ", "")

		// Get physical dimensions in millimeters
		w := int(info.MmWidth)
		h := int(info.MmHeight)
		isPrimary := false
		pixelClock := float64(mode.DotClock) / 1000000.0 // Convert to MHz

		display := types.Display{
			ID:                   id,
			Name:                 name,
			ResolutionHorizontal: int(resolutionWidth),
			ResolutionVertical:   int(resolutionHeight),
			X:                    int(x),
			Y:                    int(y),
			Width:                &w,
			Height:               &h,
			IsPrimary:            &isPrimary,
			PixelClock:           &pixelClock,
			RefreshRate:          &refreshRate,
		}

		// Store primary display separately
		if output == primary.Output {
			primaryDisplay = &display
		} else {
			displays = append(displays, display)
		}
	}

	// Add primary display at the beginning if found
	if primaryDisplay != nil {
		displays = append([]types.Display{*primaryDisplay}, displays...)
	}

	return displays, nil
}
