package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
)

func RegisterGetSettingsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetSettings, func(message event.Message) event.MessageResponse {
		log.Infof("Received get settings event: %v", message)

		settings, err := settings.Load()
		if err != nil {
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
			Data:    settings,
			Message: "Got settings",
		}
	})
}
