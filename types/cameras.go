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
	Group    string                `json:"group" mapstructure:"group"` // The set it's in, such as User Controls or Camera Controls
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

// CameraFormat is a pixel format a camera captures in, with a size
type CameraFormat struct {
	Format string `json:"format" mapstructure:"format"` // The four character code, such as MJPG or YUYV
	Name   string `json:"name" mapstructure:"name"`     // Such as Motion-JPEG
	Width  int64  `json:"width" mapstructure:"width"`
	Height int64  `json:"height" mapstructure:"height"`
}

// CameraSize is a frame size a camera captures at
type CameraSize struct {
	Width  int64 `json:"width" mapstructure:"width"`
	Height int64 `json:"height" mapstructure:"height"`
}

// Camera is a video capture device, such as a webcam
type Camera struct {
	ID       string          `json:"id" mapstructure:"id"` // Stays the same across reconnects where the system allows
	Name     string          `json:"name" mapstructure:"name"`
	Device   string          `json:"device" mapstructure:"device"` // Such as /dev/video0
	Driver   *string         `json:"driver" mapstructure:"driver"`
	Format   *CameraFormat   `json:"format" mapstructure:"format"`   // What it captures in now, null when it can't be read
	Formats  []CameraFormat  `json:"formats" mapstructure:"formats"` // Each format it supports, at its largest size
	Sizes    []CameraSize    `json:"sizes" mapstructure:"sizes"`     // Each size it captures at in any format, largest first, which pictures can be taken at
	Controls []CameraControl `json:"controls" mapstructure:"controls"`
}

// CamerasData lists the system's cameras
type CamerasData struct {
	Cameras []Camera `json:"cameras" mapstructure:"cameras"` // Linux only, empty elsewhere
}

// CameraPicture is a picture taken with a camera
type CameraPicture struct {
	ID          string `json:"id" mapstructure:"id"`                     // The camera's id
	ContentType string `json:"content_type" mapstructure:"content_type"` // Such as image/jpeg
	Image       string `json:"image" mapstructure:"image"`               // Base64
}
