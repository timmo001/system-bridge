package displays

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

// GetDisplays returns display information for the current platform
func GetDisplays() ([]Display, error) {
	return getDisplays()
}
