package event_handler

import (
	"os"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterExitApplicationHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventExitApplication, func(message event.Message) event.MessageResponse {
		log.Infof("Received exit event: %v", message)

		log.Info("Exiting backend...")
		defer os.Exit(0)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeApplicationExiting,
			Subtype: event.ResponseSubtypeNone,
			Data:    map[string]any{},
			Message: "Application is exiting",
		}
	})
}
