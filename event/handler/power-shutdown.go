package event_handler

import (
	"log/slog"
	"time"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/power"
)

func RegisterPowerShutdownHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerShutdown, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received power shutdown event", "message", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Shutdown the system
			if err := power.Shutdown(); err != nil {
				slog.Error("Failed to shutdown system", "error", err)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerShuttingdown,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Shutting down",
		}
	})
}
