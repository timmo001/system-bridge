package types

// DiagnosticsModule is how a data module's updates are going
type DiagnosticsModule struct {
	Name        ModuleName `json:"name" mapstructure:"name"`
	HasData     bool       `json:"has_data" mapstructure:"has_data"`
	Updated     *string    `json:"updated" mapstructure:"updated"`             // When it last succeeded, RFC 3339, null before it has
	Failures    int        `json:"failures" mapstructure:"failures"`           // Failed updates in a row, 0 once one succeeds
	LastError   *string    `json:"last_error" mapstructure:"last_error"`       // With the home directory and user name masked
	LastErrorAt *int64     `json:"last_error_at" mapstructure:"last_error_at"` // Unix seconds
}

// DiagnosticsSettings sums up the settings that change behaviour, as counts
// and switches only, never paths or commands
type DiagnosticsSettings struct {
	Autostart                   bool `json:"autostart" mapstructure:"autostart"`
	SystemTray                  bool `json:"system_tray" mapstructure:"system_tray"`
	Hotkeys                     int  `json:"hotkeys" mapstructure:"hotkeys"`
	Commands                    int  `json:"commands" mapstructure:"commands"`
	MediaDirectories            int  `json:"media_directories" mapstructure:"media_directories"`
	AllowedSecondaryMountPoints int  `json:"allowed_secondary_mount_points" mapstructure:"allowed_secondary_mount_points"`
	CamerasCapture              bool `json:"cameras_capture" mapstructure:"cameras_capture"`
	DesktopWindowTitles         bool `json:"desktop_window_titles" mapstructure:"desktop_window_titles"`
	DesktopHyprlandCode         bool `json:"desktop_hyprland_code" mapstructure:"desktop_hyprland_code"`
}

// DiagnosticsLogRecord is a recent warning or error from the app's log
type DiagnosticsLogRecord struct {
	Time    int64   `json:"time" mapstructure:"time"`   // Unix seconds
	Level   string  `json:"level" mapstructure:"level"` // WARN or ERROR
	Message string  `json:"message" mapstructure:"message"`
	Error   *string `json:"error" mapstructure:"error"` // With the home directory and user name masked
	Module  *string `json:"module" mapstructure:"module"`
	Event   *string `json:"event" mapstructure:"event"`
}

// Diagnostics is what the app knows about its own health, curated so it's
// safe to share in a bug report
type Diagnostics struct {
	Version      string                 `json:"version" mapstructure:"version"`
	Platform     string                 `json:"platform" mapstructure:"platform"`         // Such as linux or windows
	Architecture string                 `json:"architecture" mapstructure:"architecture"` // Such as amd64 or arm64
	StartedAt    int64                  `json:"started_at" mapstructure:"started_at"`     // Unix seconds
	LogLevel     string                 `json:"log_level" mapstructure:"log_level"`
	Modules      []DiagnosticsModule    `json:"modules" mapstructure:"modules"`
	Settings     *DiagnosticsSettings   `json:"settings" mapstructure:"settings"`           // null when they can't be read
	RecentErrors []DiagnosticsLogRecord `json:"recent_errors" mapstructure:"recent_errors"` // Oldest first, at most 20
}
