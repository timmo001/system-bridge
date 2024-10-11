package main

import (
	"fmt"
	"time"

	"github.com/joho/godotenv"
	"github.com/timmo001/system-bridge/assert"
	"github.com/timmo001/system-bridge/logger"
	"github.com/timmo001/system-bridge/modules"
	"github.com/timmo001/system-bridge/server"
	"github.com/timmo001/system-bridge/timer"
	"github.com/timmo001/system-bridge/version"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// Setup logger
	l := logger.CreateLogger("main")

	// Initial log
	l.Info(fmt.Sprintf("--- System Bridge %s ---", version.GetVersion()))

	// Create channels for server and timer
	channelServer := make(chan bool)
	channelTimer := make(chan bool)

	// Start server
	s := server.NewServer(channelServer)
	go s.Start()

	// // Setup timer for updating modules
	t := timer.NewTimer(channelTimer, "modules", updateModules)
	t.Start(time.Second * 30)

	// Wait for server or timer to stop
	select {
	case <-channelServer:
		l.Warn("Server stopped")
	case <-channelTimer:
		l.Warn("Timer stopped")
	}

	assert.Never("Application stopped unexpectedly")
}

func updateModules() {
	l := logger.CreateLogger("modules-updater")
	l.Info("Updating modules")

	// TODO: Move to struct
	m := modules.NewModules()

	go func() {
		// Update modules
		m.UpdateSystem()
		l.Infof("System updated: %+v", m.System)
	}()
}
