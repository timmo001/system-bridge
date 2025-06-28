package settings

import (
	"github.com/timmo001/system-bridge/settings"
)

// Settings represents the application settings
type Settings = settings.Settings

// Load loads the settings from disk
func Load() (*Settings, error) {
	return settings.Load()
}

// Save saves the settings to disk
func Save(settings *Settings) error {
	return settings.Save()
}

// Update updates the settings with new values
func Update(current *Settings, new *Settings) error {
	current.Autostart = new.Autostart
	current.Hotkeys = new.Hotkeys
	current.LogLevel = new.LogLevel
	current.Media = new.Media
	return current.Save()
}
