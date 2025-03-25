package backend

import (
	"context"

	"github.com/charmbracelet/log"
)

func Run(ctx context.Context) error {
	log.Info("Running backend server...")

	// Start your server and other services here
	// TODO: Add your server initialization here

	log.Info("Backend server is running")

	// Wait for context cancellation
	<-ctx.Done()

	log.Info("Backend server is shutting down...")
	return nil
}
