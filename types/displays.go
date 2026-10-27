package types

// DisplayPowerState is a monitor's DDC/CI power mode, or on or off from
// Hyprland's DPMS for a display without DDC/CI
type DisplayPowerState string

const (
	DisplayPowerStateOn      DisplayPowerState = "on"
	DisplayPowerStateStandby DisplayPowerState = "standby"
	DisplayPowerStateSuspend DisplayPowerState = "suspend"
	DisplayPowerStateOff     DisplayPowerState = "off"
)

// Display represents information about a display device
type Display struct {
	ID                   string             `json:"id"`
	Name                 string             `json:"name"`
	ResolutionHorizontal int                `json:"resolution_horizontal"`
	ResolutionVertical   int                `json:"resolution_vertical"`
	X                    *int               `json:"x"`
	Y                    *int               `json:"y"`
	Width                *int               `json:"width"`
	Height               *int               `json:"height"`
	IsPrimary            *bool              `json:"is_primary"`
	PixelClock           *float64           `json:"pixel_clock"`
	RefreshRate          *float64           `json:"refresh_rate"`
	Brightness           *float64           `json:"brightness"` // Percent, nil when it can't be read
	PowerState           *DisplayPowerState `json:"power_state"`
}

// DisplaysData represents information about all display devices
type DisplaysData = []Display
