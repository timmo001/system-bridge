package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
)

type UpdateSettingsRequestData = settings.Settings

type UpdateSettingsResponseData = settings.Settings

func RegisterUpdateSettingsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventUpdateSettings, func(message event.Message) event.MessageResponse {
		log.Infof("Received update settings event: %v", message)

		settings, err := settings.Load()
		if err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to load settings",
			}
		}

		data := UpdateSettingsRequestData{}
		err = mapstructure.Decode(message.Data, &data)
		if err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode update settings event data",
			}
		}

		settings.API = data.API
		settings.Autostart = data.Autostart
		settings.Hotkeys = data.Hotkeys
		settings.LogLevel = data.LogLevel
		settings.Media = data.Media

		err = settings.Save()
		if err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to save settings",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeSettingsUpdated,
			Subtype: event.ResponseSubtypeNone,
			Data:    settings,
			Message: "Settings updated",
		}
	})
}
