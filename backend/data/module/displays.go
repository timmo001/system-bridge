package data_module

import "github.com/charmbracelet/log"

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

func (t *Module) UpdateDisplaysModule() (DisplaysData, error) {
	log.Info("Getting displays data")

	// TODO: Implement
	return DisplaysData{}, nil
}
