package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/backend/event"
	"github.com/timmo001/system-bridge/utils/handlers/settings"
)

type UpdateSettingsRequestData = settings.Settings

type UpdateSettingsResponseData = settings.Settings

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

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeSettingsUpdated,
			Subtype: event.ResponseSubtypeNone,
			Data:    currentSettings,
			Message: "Settings updated",
		}
	})
}
