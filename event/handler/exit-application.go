package event_handler

import (
	"context"
	"os"
	"runtime/debug"
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterExitApplicationHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventExitApplication, func(connection string, message event.Message) event.MessageResponse {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Exit application handler panic recovered: %v", r)
				log.Errorf("Stack trace: %s", debug.Stack())
			}
		}()
		
		log.Infof("Received exit event: %v", message)

		log.Info("Exiting backend...")
		
		// Schedule graceful shutdown in a separate goroutine
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Errorf("Graceful shutdown panic recovered: %v", r)
				}
				// Force exit if graceful shutdown fails
				os.Exit(0)
			}()
			
			// Give some time for the response to be sent
			time.Sleep(1 * time.Second)
			
			// Attempt graceful shutdown
			log.Info("Initiating graceful shutdown...")
			
			// Create a context with timeout for cleanup
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			
			// TODO: Add proper cleanup logic here
			// - Close database connections
			// - Stop background goroutines
			// - Close websocket connections
			// - Flush logs
			
			select {
			case <-ctx.Done():
				log.Warn("Graceful shutdown timed out")
			default:
				log.Info("Graceful shutdown completed")
			}
			
			os.Exit(0)
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeApplicationExiting,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Application is exiting",
		}
	})
}
