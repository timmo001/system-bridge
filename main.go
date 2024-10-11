package main

import (
	"fmt"

	"github.com/joho/godotenv"
	"github.com/timmo001/system-bridge/assert"
	"github.com/timmo001/system-bridge/logger"
	"github.com/timmo001/system-bridge/server"
	"github.com/timmo001/system-bridge/timer"
	"github.com/timmo001/system-bridge/version"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// Setup logger
	l := logger.CreateLogger("Main")

	// Initial log
	l.Info(fmt.Sprintf("--- System Bridge %s ---", version.GetVersion()))

	// Create channels for server and timer
	channelServer := make(chan bool)
	channelTimer := make(chan bool)

	// Start server
	go server.Start(channelServer)

	// Start timer
	t := timer.NewTimer(channelTimer, l)

	// Wait for server or timer to stop
	select {
	case <-channelServer:
		l.Info("Server stopped")
	case <-channelTimer:
		l.Info("Timer stopped")
	}

	assert.Never("Application stopped unexpectedly")
}
