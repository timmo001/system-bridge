package types

// CameraControlType is the kind of value a camera control takes
type CameraControlType string

const (
	CameraControlTypeInteger CameraControlType = "integer"
	CameraControlTypeBoolean CameraControlType = "boolean"
	CameraControlTypeMenu    CameraControlType = "menu"
)

// CameraControlOption is one choice of a menu control
type CameraControlOption struct {
	Value int64  `json:"value" mapstructure:"value"`
	Name  string `json:"name" mapstructure:"name"`
}

// CameraControl is a setting of a camera, such as its brightness, zoom or
// white balance
type CameraControl struct {
	ID       string                `json:"id" mapstructure:"id"` // Such as brightness or focus_automatic_continuous
	Name     string                `json:"name" mapstructure:"name"`
	Type     CameraControlType     `json:"type" mapstructure:"type"`
	Value    int64                 `json:"value" mapstructure:"value"`
	Minimum  int64                 `json:"minimum" mapstructure:"minimum"`
	Maximum  int64                 `json:"maximum" mapstructure:"maximum"`
	Step     int64                 `json:"step" mapstructure:"step"`
	Default  int64                 `json:"default" mapstructure:"default"`
	Options  []CameraControlOption `json:"options" mapstructure:"options"`   // The choices of a menu control, empty for the others
	Inactive bool                  `json:"inactive" mapstructure:"inactive"` // Set while another control overrides it, such as focus with autofocus on
	ReadOnly bool                  `json:"read_only" mapstructure:"read_only"`
}

// Camera is a video capture device, such as a webcam
type Camera struct {
	ID       string          `json:"id" mapstructure:"id"` // Stays the same across reconnects where the system allows
	Name     string          `json:"name" mapstructure:"name"`
	Device   string          `json:"device" mapstructure:"device"` // Such as /dev/video0
	Driver   *string         `json:"driver" mapstructure:"driver"`
	Controls []CameraControl `json:"controls" mapstructure:"controls"`
}

// CamerasData lists the system's cameras
type CamerasData struct {
	Cameras []Camera `json:"cameras" mapstructure:"cameras"` // Linux only, empty elsewhere
}
