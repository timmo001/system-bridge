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

//go:embed system-bridge.autostart.desktop
var linuxAutostartDesktopFile []byte

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

		if !currentSettings.Autostart && newSettings.Autostart {
			switch runtime.GOOS {
			case "linux":
				// Write autostart desktop file in ~/.config/autostart/system-bridge.desktop
				err = os.WriteFile(filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"), linuxAutostartDesktopFile, 0644)
				if err != nil {
					log.Errorf("Failed to write autostart desktop file: %v", err)
				} else {
					log.Infof("Autostart desktop file written to %s", filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"))
				}
			case "windows":
				// Create shortcut in startup folder

				// Get current executable path
				executablePath := os.Args[0]

				// Get working directory
				workingDirectory := filepath.Dir(os.Args[0])

				// Get icon path
				iconPath := filepath.Join(workingDirectory, "system-bridge.ico")

				windowsShortcutData := []byte(`[Shell]
Command=` + executablePath + `
Icon=` + iconPath + `
WorkingDirectory=` + workingDirectory + `
`)

				shortcutPath := filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "system-bridge.lnk")
				err = os.WriteFile(shortcutPath, windowsShortcutData, 0644)
				if err != nil {
					log.Errorf("Failed to write autostart shortcut: %v", err)
				} else {
					log.Infof("Autostart shortcut written to %s", shortcutPath)
				}
			default:
				log.Warnf("Autostart is not supported on %s", runtime.GOOS)
			}
		} else if currentSettings.Autostart && !newSettings.Autostart {
			switch runtime.GOOS {
			case "linux":
				// Remove autostart desktop file in ~/.config/autostart/system-bridge.desktop
				err = os.Remove(filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"))
				if err != nil {
					log.Errorf("Failed to remove autostart desktop file: %v", err)
				} else {
					log.Infof("Autostart desktop file removed from %s", filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"))
				}
			case "windows":
				// Remove shortcut from startup folder
				err = os.Remove(filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "system-bridge.lnk"))
				if err != nil {
					log.Errorf("Failed to remove autostart shortcut: %v", err)
				} else {
					log.Infof("Autostart desktop file removed from %s", filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "system-bridge.lnk"))
				}
			default:
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
