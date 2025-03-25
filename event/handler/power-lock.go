package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterPowerLockHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerLock, func(message event.Message) event.MessageResponse {
		log.Infof("Received power lock event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerLocking,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Locking",
		}
	})
}
