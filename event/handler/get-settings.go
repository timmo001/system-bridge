package event_handler

import (
	"log/slog"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/settings"
)

type GetSettingsResponseData = settings.Settings

func RegisterGetSettingsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetSettings, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received get settings event", "message", message)

		settings, err := settings.Load()
		if err != nil {
			slog.Error("Failed to load settings", "error", err)
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
