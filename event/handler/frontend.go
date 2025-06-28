package event_handler

import "github.com/timmo001/system-bridge/utils/handlers/settings"

func settingsToFrontend(s *settings.Settings) map[string]interface{} {
	return map[string]interface{}{
		"api":       s.API,
		"autostart": s.Autostart,
		"hotkeys":   s.Hotkeys,
		"logLevel":  s.LogLevel.String(),
		"media":     s.Media,
	}
}
