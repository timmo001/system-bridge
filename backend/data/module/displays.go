package data_module

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/jezek/xgb"
	"github.com/jezek/xgb/randr"
	"github.com/jezek/xgb/xproto"
)

// Display represents information about a display device
type Display struct {
	ID                   string   `json:"id"`
	Name                 string   `json:"name"`
	ResolutionHorizontal int      `json:"resolution_horizontal"`
	ResolutionVertical   int      `json:"resolution_vertical"`
	X                    int      `json:"x"`
	Y                    int      `json:"y"`
	Width                *int     `json:"width"`
	Height               *int     `json:"height"`
	IsPrimary            *bool    `json:"is_primary"`
	PixelClock           *float64 `json:"pixel_clock"`
	RefreshRate          *float64 `json:"refresh_rate"`
}

// DisplaysData represents information about all display devices
type DisplaysData struct {
	Displays []Display `json:"displays"`
}

// isWayland checks if the system is running Wayland
func isWayland() bool {
	return os.Getenv("WAYLAND_DISPLAY") != "" || os.Getenv("WAYLAND_SOCKET") != ""
}

// getDisplaysX11 gets display information using X11/XRandR
func (t *Module) getDisplaysX11() ([]Display, error) {
	displays := make([]Display, 0)
	var primaryDisplay *Display

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

		// Get physical dimensions in millimeters
		w := int(info.MmWidth)
		h := int(info.MmHeight)
		isPrimary := false
		pixelClock := float64(mode.DotClock) / 1000000.0 // Convert to MHz

		display := Display{
			ID:                   fmt.Sprintf("%d", output),
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
		displays = append([]Display{*primaryDisplay}, displays...)
	}

	return displays, nil
}

// getDisplaysWayland gets display information using Wayland
func (t *Module) getDisplaysWayland() ([]Display, error) {
	displays := make([]Display, 0)
	var primaryDisplay *Display

	// Try to get display info from sway/i3 if available
	if os.Getenv("SWAYSOCK") != "" {
		// Use swaymsg to get outputs
		cmd := exec.Command("swaymsg", "-t", "get_outputs", "--raw")
		output, err := cmd.Output()
		if err == nil {
			var swayOutputs []struct {
				Name       string `json:"name"`
				Active     bool   `json:"active"`
				Primary    bool   `json:"primary"`
				Rect      struct {
					X      int `json:"x"`
					Y      int `json:"y"`
					Width  int `json:"width"`
					Height int `json:"height"`
				} `json:"rect"`
				CurrentMode struct {
					Width   int     `json:"width"`
					Height  int     `json:"height"`
					Refresh float64 `json:"refresh"`
				} `json:"current_mode"`
			}

			if err := json.Unmarshal(output, &swayOutputs); err == nil {
				for i, out := range swayOutputs {
					if !out.Active {
						continue
					}

					isPrimary := false
					display := Display{
						ID:                   fmt.Sprintf("wayland-%d", i),
						Name:                 out.Name,
						ResolutionHorizontal: out.CurrentMode.Width,
						ResolutionVertical:  out.CurrentMode.Height,
						X:                    out.Rect.X,
						Y:                    out.Rect.Y,
						Width:                &out.Rect.Width,
						Height:               &out.Rect.Height,
						IsPrimary:            &isPrimary,
						RefreshRate:          &out.CurrentMode.Refresh,
					}

					if out.Primary {
						primaryDisplay = &display
					} else {
						displays = append(displays, display)
					}
				}

				// Add primary display at the beginning if found
				if primaryDisplay != nil {
					displays = append([]Display{*primaryDisplay}, displays...)
				}
				return displays, nil
			}
		}
	}

	// Fallback to wlr-randr if available
	cmd := exec.Command("wlr-randr")
	output, err := cmd.Output()
	if err == nil {
		// Parse wlr-randr output
		lines := strings.Split(string(output), "\n")
		var currentDisplay *Display

		for _, line := range lines {
			if strings.HasPrefix(line, " ") {
				// This is a property of the current display
				if currentDisplay != nil {
					if strings.Contains(line, "Position:") {
						parts := strings.Fields(line)
						if len(parts) >= 3 {
							x, _ := strconv.Atoi(parts[1])
							y, _ := strconv.Atoi(parts[2])
							currentDisplay.X = x
							currentDisplay.Y = y
						}
					} else if strings.Contains(line, "Resolution:") {
						parts := strings.Fields(line)
						if len(parts) >= 3 {
							width, _ := strconv.Atoi(parts[1])
							height, _ := strconv.Atoi(parts[2])
							currentDisplay.ResolutionHorizontal = width
							currentDisplay.ResolutionVertical = height
							w, h := width, height
							currentDisplay.Width = &w
							currentDisplay.Height = &h
						}
					} else if strings.Contains(line, "Refresh:") {
						parts := strings.Fields(line)
						if len(parts) >= 2 {
							rate, _ := strconv.ParseFloat(strings.TrimSuffix(parts[1], "Hz"), 64)
							currentDisplay.RefreshRate = &rate
						}
					}
				}
			} else if line != "" {
				// This is a new display
				name := strings.TrimSpace(strings.Split(line, " ")[0])
				isPrimary := strings.Contains(line, "primary")
				currentDisplay = &Display{
					ID:        fmt.Sprintf("wayland-%s", name),
					Name:      name,
					IsPrimary: &isPrimary,
				}

				if isPrimary {
					if primaryDisplay != nil {
						displays = append(displays, *primaryDisplay)
					}
					primaryDisplay = currentDisplay
				} else {
					displays = append(displays, *currentDisplay)
				}
			}
		}

		// Add primary display at the beginning if found
		if primaryDisplay != nil {
			displays = append([]Display{*primaryDisplay}, displays...)
		}
		return displays, nil
	}

	return displays, fmt.Errorf("no supported Wayland display information source found")
}

func (t *Module) UpdateDisplaysModule() (DisplaysData, error) {
	log.Info("Getting displays data")

	var displaysData DisplaysData
	displaysData.Displays = make([]Display, 0)

	if runtime.GOOS == "linux" {
		var displays []Display
		var err error

		// if isWayland() {
		// 	displays, err = t.getDisplaysWayland()
		// 	if err != nil {
		// 		log.Debug("failed to get Wayland display info", "error", err)
		// 	}
		// }

		// If Wayland detection failed or we're on X11, try X11
		if len(displays) == 0 {
			displays, err = t.getDisplaysX11()
			if err != nil {
				log.Debug("failed to get X11 display info", "error", err)
			}
		}

		// Log error only if both fail
		if err != nil && len(displays) == 0 {
			log.Error("failed to get display info", "error", err)
		}

		displaysData.Displays = displays
	} else if runtime.GOOS == "windows" {
		// TODO: Implement Windows display detection using win32 API
		// This will require CGO and the windows system headers
	} else if runtime.GOOS == "darwin" {
		// TODO: Implement macOS display detection using Quartz Display Services
		// This will require CGO and the CoreGraphics framework
	}

	return displaysData, nil
}
