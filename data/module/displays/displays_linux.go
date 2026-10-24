//go:build linux

package displays

import (
	"context"
	"fmt"
	"strings"

	"log/slog"

	"github.com/jezek/xgb"
	"github.com/jezek/xgb/randr"
	"github.com/jezek/xgb/xproto"
	"github.com/timmo001/system-bridge/types"
)

// GetDisplays lists displays from X11 when there's an X server, and from the
// kernel's DRM connectors otherwise, such as under Wayland, then reads each
// one's brightness and power state.
func GetDisplays(ctx context.Context) ([]types.Display, error) {
	displays, err := x11Displays()
	if err != nil {
		slog.Debug("X11 displays unavailable, reading DRM connectors", "error", err)
		displays, err = drmDisplays(drmPath)
		if err != nil {
			return nil, err
		}
	}

	addControls(ctx, displays)
	return displays, nil
}

func x11Displays() ([]types.Display, error) {
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
		slog.Error("failed to get primary output", "error", err)
	}

	// Iterate through outputs
	for _, output := range resources.Outputs {
		info, err := randr.GetOutputInfo(X, output, 0).Reply()
		if err != nil {
			slog.Error("failed to get output info", "error", err)
			continue
		}

		if info.Connection != randr.ConnectionConnected {
			continue
		}

		// Get crtc info for position, resolution, and active mode
		var x, y int16
		var resolutionWidth, resolutionHeight uint16
		var mode randr.ModeInfo
		if info.Crtc != 0 {
			crtc, err := randr.GetCrtcInfo(X, info.Crtc, 0).Reply()
			if err == nil {
				x = crtc.X
				y = crtc.Y
				resolutionWidth = crtc.Width
				resolutionHeight = crtc.Height

				// Find the CRTC's active mode from resources
				for _, m := range resources.Modes {
					if m.Id == uint32(crtc.Mode) {
						mode = m
						break
					}
				}
			}
		}

		// Calculate refresh rate in Hertz
		// RandR reports DotClock in Hz
		refreshRate := float64(mode.DotClock) / (float64(mode.Htotal) * float64(mode.Vtotal))

		// Convert name from []byte to string
		name := string(info.Name)

		id := strings.ReplaceAll(name, " ", "")

		// Get physical dimensions in millimeters
		w := int(info.MmWidth)
		h := int(info.MmHeight)
		posX := int(x)
		posY := int(y)
		isPrimary := (output == primary.Output)
		// Pixel clock in MHz (DotClock is Hz)
		pixelClock := float64(mode.DotClock) / 1000000.0

		display := types.Display{
			ID:                   id,
			Name:                 name,
			ResolutionHorizontal: int(resolutionWidth),
			ResolutionVertical:   int(resolutionHeight),
			X:                    &posX,
			Y:                    &posY,
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
