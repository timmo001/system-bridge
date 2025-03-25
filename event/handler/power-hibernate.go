package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterPowerHibernateHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerHibernate, func(message event.Message) event.MessageResponse {
		log.Infof("Received power hibernate event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerHibernating,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Hibernating",
		}
	})
}
