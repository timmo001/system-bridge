package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterPowerSleepHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerSleep, func(message event.Message) event.MessageResponse {
		log.Infof("Received power sleep event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerSleeping,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Sleeping",
		}
	})
}
