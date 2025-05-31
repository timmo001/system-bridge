package event_handler

import (
	_ "embed"
	"os"
	"path/filepath"
	"runtime"

	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/settings"
)

type UpdateSettingsRequestData = settings.Settings

type UpdateSettingsResponseData = settings.Settings

//go:embed .scripts/linux/system-bridge.autostart.desktop
var autostartDesktopFile []byte

func RegisterUpdateSettingsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventUpdateSettings, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received update settings event: %v", message)

		currentSettings, err := settings.Load()
		if err != nil {
			log.Errorf("Failed to load settings: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to load settings",
			}
		}

		newSettings := UpdateSettingsRequestData{}
		err = mapstructure.Decode(message.Data, &newSettings)
		if err != nil {
			log.Errorf("Failed to decode update settings event data: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode update settings event data",
			}
		}

		err = settings.Update(currentSettings, &newSettings)
		if err != nil {
			log.Errorf("Failed to update settings: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to save settings",
			}
		}

		if currentSettings.Autostart == false && newSettings.Autostart == true {
			switch runtime.GOOS {
			case "linux":
				// Write autostart desktop file in ~/.config/autostart/system-bridge.desktop
				err = os.WriteFile(filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"), autostartDesktopFile, 0644)
				if err != nil {
					log.Errorf("Failed to write autostart desktop file: %v", err)
				}
			default:
				// case "windows":
				// 	// TODO: Add to startup folder
				// case "darwin":
				// 	// TODO: Add to startup
				log.Warnf("Autostart is not supported on %s", runtime.GOOS)
			}
		} else if currentSettings.Autostart == true && newSettings.Autostart == false {
			switch runtime.GOOS {
			case "linux":
				// Remove autostart desktop file in ~/.config/autostart/system-bridge.desktop
				err = os.Remove(filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"))
				if err != nil {
					log.Errorf("Failed to remove autostart desktop file: %v", err)
				}
			default:
				// case "windows":
				// 	// TODO: Remove from startup folder
				// case "darwin":
				// 	// TODO: Remove from startup
				log.Warnf("Autostart is not supported on %s", runtime.GOOS)
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeSettingsUpdated,
			Subtype: event.ResponseSubtypeNone,
			Data:    currentSettings,
			Message: "Settings updated",
		}
	})
}
