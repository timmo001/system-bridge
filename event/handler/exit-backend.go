package event_handler

import (
	"os"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterExitHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventExit, func(message event.Message) event.MessageResponse {
		log.Infof("Received exit event: %v", message)

		log.Info("Exiting backend...")
		defer os.Exit(0)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeSuccess,
			Message: "Backend exited successfully",
		}
	})
}
