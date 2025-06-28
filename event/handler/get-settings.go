package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/settings"
)

type GetSettingsResponseData = settings.Settings

func RegisterGetSettingsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetSettings, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received get settings event: %v", message)

		settings, err := settings.Load()
		if err != nil {
			log.Errorf("Failed to load settings: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to load settings",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeSettingsResult,
			Subtype: event.ResponseSubtypeNone,
			Data:    settingsToFrontend(settings),
			Message: "Got settings",
		}
	})
}
