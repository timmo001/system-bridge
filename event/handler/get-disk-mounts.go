package event_handler

import (
	"log/slog"

	data_module "github.com/timmo001/system-bridge/data/module"
	"github.com/timmo001/system-bridge/event"
)

func RegisterGetDiskMountsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetDiskMounts, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received get disk mounts event", "message", message)

		response, err := data_module.GetAllMountsCategorized()
		if err != nil {
			slog.Error("Failed to get disk mounts", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to get disk mounts",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDiskMounts,
			Subtype: event.ResponseSubtypeNone,
			Data:    response,
			Message: "Got disk mounts",
		}
	})
}
