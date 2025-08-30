package event_handler

import (
	_ "embed"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"runtime"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	settingspkg "github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/settings"
)

type UpdateSettingsRequestData = settings.Settings

type UpdateSettingsResponseData = settings.Settings

//go:embed system-bridge.autostart.desktop
var linuxAutostartDesktopFile []byte

func RegisterUpdateSettingsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventUpdateSettings, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received update settings event", "message", message)

		currentSettings, err := settings.Load()
		if err != nil {
			slog.Error("Failed to load settings", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to load settings",
			}
		}

		// Keep a copy of the original settings for comparison
		originalSettings := *currentSettings

		newSettings := UpdateSettingsRequestData{}
		// Add decode hook for LogLevel
		dc := &mapstructure.DecoderConfig{
			DecodeHook: mapstructure.ComposeDecodeHookFunc(
				func(from, to reflect.Type, data any) (any, error) {
					if to == reflect.TypeOf(settingspkg.LogLevel("")) && from.Kind() == reflect.String {
						str, ok := data.(string)
						if !ok {
							return nil, fmt.Errorf("expected string for log level but got %T", data)
						}
						parsed, err := settingspkg.ParseLogLevel(str)
						if err != nil {
							return nil, err
						}
						return parsed, nil
					}
					return data, nil
				},
			),
			Result: &newSettings,
		}
		dec, err := mapstructure.NewDecoder(dc)
		if err != nil {
			slog.Error("Failed to create decoder", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode update settings event data",
			}
		}
		err = dec.Decode(message.Data)
		if err != nil {
			slog.Error("Failed to decode update settings event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode update settings event data",
			}
		}

		err = settings.Update(currentSettings, &newSettings)
		if err != nil {
			slog.Error("Failed to update settings", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to save settings",
			}
		}

		slog.Info("Settings updated", "original", originalSettings, "new", newSettings)

		// Only handle autostart changes when running from a real binary
		if !utils.IsRunningFromRealBinary() {
			slog.Info("Autostart changes ignored - running in development mode")
		} else if !originalSettings.Autostart && newSettings.Autostart {
			slog.Info("Autostart has changed:", "original", originalSettings.Autostart, "new", newSettings.Autostart)
			switch runtime.GOOS {
			case "linux":
				// Write autostart desktop file in ~/.config/autostart/system-bridge.desktop
				err = os.WriteFile(filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"), linuxAutostartDesktopFile, 0644)
				if err != nil {
					slog.Error("Failed to write autostart desktop file", "error", err)
				} else {
					slog.Info("Autostart desktop file written", "path", filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"))
				}
			case "windows":
				// Create shortcut in startup folder using PowerShell
				slog.Info("Creating autostart shortcut in startup folder")

				// Get current executable path
				executablePath := os.Args[0]

				// Get working directory
				workingDirectory := filepath.Dir(os.Args[0])

				// Get icon path
				iconPath := filepath.Join(workingDirectory, "system-bridge.ico")

				// Path to the shortcut
				shortcutPath := filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "system-bridge.lnk")

				// PowerShell script to create the shortcut
				psScript := fmt.Sprintf(`$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%s'); $Shortcut.TargetPath = '%s'; $Shortcut.Arguments = 'backend'; $Shortcut.WorkingDirectory = '%s'; $Shortcut.IconLocation = '%s'; $Shortcut.Save();`, shortcutPath, executablePath, workingDirectory, iconPath)

				cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", psScript)
				utils.SetHideWindow(cmd)
				output, err := cmd.CombinedOutput()
				if err != nil {
					slog.Error("Failed to create autostart shortcut via PowerShell", "error", err, "output", string(output))
				} else {
					slog.Info("Autostart shortcut created via PowerShell", "path", shortcutPath)
				}
			default:
				slog.Warn(fmt.Sprintf("Autostart is not supported on %s", runtime.GOOS))
			}
		} else if originalSettings.Autostart && !newSettings.Autostart {
			switch runtime.GOOS {
			case "linux":
				// Remove autostart desktop file in ~/.config/autostart/system-bridge.desktop
				err = os.Remove(filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"))
				if err != nil {
					slog.Error("Failed to remove autostart desktop file", "error", err)
				} else {
					slog.Info("Autostart desktop file removed", "path", filepath.Join(os.Getenv("HOME"), ".config", "autostart", "system-bridge.desktop"))
				}
			case "windows":
				// Remove shortcut from startup folder
				err = os.Remove(filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "system-bridge.lnk"))
				if err != nil {
					slog.Error("Failed to remove autostart shortcut", "error", err)
				} else {
					slog.Info("Autostart desktop file removed", "path", filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "system-bridge.lnk"))
				}
			default:
				slog.Warn(fmt.Sprintf("Autostart is not supported on %s", runtime.GOOS))
			}
		}

		if originalSettings.LogLevel != newSettings.LogLevel {
			slog.Info("LogLevel has changed:", "original", originalSettings.LogLevel, "new", newSettings.LogLevel)
			slog.SetLogLoggerLevel(newSettings.LogLevel.ToSlogLevel())
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeSettingsUpdated,
			Subtype: event.ResponseSubtypeNone,
			Data:    settingsToFrontend(currentSettings),
			Message: "Settings updated",
		}
	})
}
