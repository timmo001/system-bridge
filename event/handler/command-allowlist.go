package event_handler

import (
	"fmt"
	"log/slog"
	"slices"
	"sync"

	"github.com/go-viper/mapstructure/v2"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/event"
	settingspkg "github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/settings"
)

// settingsWrite keeps one change to the settings from loading them while
// another is still saving, so neither undoes the other
var settingsWrite sync.Mutex

// broadcastSettings tells every client the settings changed, so pages open in
// other tabs show them before anyone edits a stale copy
func broadcastSettings(current *settings.Settings) {
	ws := websocket.GetInstance()
	if ws == nil {
		return
	}
	ws.BroadcastMessage(event.MessageResponse{
		ID:      "system",
		Type:    event.ResponseTypeSettingsChanged,
		Subtype: event.ResponseSubtypeNone,
		Data:    settingsToFrontend(current),
		Message: "Settings changed",
	})
}

// changeAllowlist applies one change to the saved allowlist and saves it. It
// only touches that command, so clients changing others don't undo each other.
func changeAllowlist(change func([]settingspkg.SettingsCommandDefinition) ([]settingspkg.SettingsCommandDefinition, error)) (*settings.Settings, error) {
	settingsWrite.Lock()
	defer settingsWrite.Unlock()

	current, err := settings.Load()
	if err != nil {
		return nil, fmt.Errorf("load settings: %w", err)
	}
	next := *current
	allowlist, err := change(slices.Clone(current.Commands.Allowlist))
	if err != nil {
		return nil, err
	}
	next.Commands = settingspkg.SettingsCommands{Allowlist: allowlist}
	if err := settings.Update(current, &next); err != nil {
		return nil, err
	}
	broadcastSettings(current)
	return current, nil
}

func commandError(message event.Message, subtype event.ResponseSubtype, text string) event.MessageResponse {
	return event.MessageResponse{
		ID:      message.ID,
		Type:    event.ResponseTypeError,
		Subtype: subtype,
		Message: text,
	}
}

// registerCommandChange registers an event that changes one command, answering
// with the saved settings
func registerCommandChange(
	router *event.MessageRouter,
	eventType event.EventType,
	responseType event.ResponseType,
	change func(command settingspkg.SettingsCommandDefinition, allowlist []settingspkg.SettingsCommandDefinition) ([]settingspkg.SettingsCommandDefinition, error),
) {
	router.RegisterSimpleHandler(eventType, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received command change", "event", eventType, "message", message)

		var command settingspkg.SettingsCommandDefinition
		if err := mapstructure.Decode(message.Data, &command); err != nil {
			slog.Error("Failed to decode command", "event", eventType, "error", err)
			return commandError(message, event.ResponseSubtypeBadRequest, "Failed to decode the command")
		}
		if command.ID == "" {
			return commandError(message, event.ResponseSubtypeBadRequest, "Missing command ID")
		}

		saved, err := changeAllowlist(func(allowlist []settingspkg.SettingsCommandDefinition) ([]settingspkg.SettingsCommandDefinition, error) {
			return change(command, allowlist)
		})
		if err != nil {
			slog.Error("Failed to change command", "event", eventType, "commandID", command.ID, "error", err)
			return commandError(message, event.ResponseSubtypeNone, err.Error())
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    responseType,
			Subtype: event.ResponseSubtypeNone,
			Data:    settingsToFrontend(saved),
			Message: "Command saved",
		}
	})
}

// RegisterCommandAllowlistHandlers adds, changes and removes one command at a
// time, rather than replacing the whole allowlist as UPDATE_SETTINGS does
func RegisterCommandAllowlistHandlers(router *event.MessageRouter) {
	index := func(allowlist []settingspkg.SettingsCommandDefinition, id string) int {
		return slices.IndexFunc(allowlist, func(command settingspkg.SettingsCommandDefinition) bool { return command.ID == id })
	}

	registerCommandChange(router, event.EventCommandAdd, event.ResponseTypeCommandAdded,
		func(command settingspkg.SettingsCommandDefinition, allowlist []settingspkg.SettingsCommandDefinition) ([]settingspkg.SettingsCommandDefinition, error) {
			if index(allowlist, command.ID) != -1 {
				return nil, fmt.Errorf("a command with ID %s already exists", command.ID)
			}
			return append(allowlist, command), nil
		})

	// Changing a command another client removed fails, rather than adding it
	// back
	registerCommandChange(router, event.EventCommandUpdate, event.ResponseTypeCommandUpdated,
		func(command settingspkg.SettingsCommandDefinition, allowlist []settingspkg.SettingsCommandDefinition) ([]settingspkg.SettingsCommandDefinition, error) {
			i := index(allowlist, command.ID)
			if i == -1 {
				return nil, fmt.Errorf("there's no command with ID %s, it may have been removed", command.ID)
			}
			allowlist[i] = command
			return allowlist, nil
		})

	registerCommandChange(router, event.EventCommandRemove, event.ResponseTypeCommandRemoved,
		func(command settingspkg.SettingsCommandDefinition, allowlist []settingspkg.SettingsCommandDefinition) ([]settingspkg.SettingsCommandDefinition, error) {
			i := index(allowlist, command.ID)
			if i == -1 {
				return allowlist, nil
			}
			return slices.Delete(allowlist, i, i+1), nil
		})
}
