package backend

import (
	"context"
	"fmt"
	"net/http"

	"github.com/charmbracelet/log"
	event_handler "github.com/timmo001/system-bridge/event/handler"
	"github.com/timmo001/system-bridge/settings"
)

type Backend struct {
	config   *settings.Config
	wsServer *WebsocketServer
}

func New(config *settings.Config) *Backend {
	return &Backend{
		config:   config,
		wsServer: NewWebsocketServer(config.API.Token),
	}
}

func (b *Backend) Run(ctx context.Context) error {
	log.Info("Running backend server...")

	// Setup event handlers
	event_handler.RegisterDataUpdateHandler(b.wsServer.eventRouter)
	event_handler.RegisterExitApplicationHandler(b.wsServer.eventRouter)
	event_handler.RegisterGetDataHandler(b.wsServer.eventRouter)
	event_handler.RegisterGetDirectoriesHandler(b.wsServer.eventRouter)
	event_handler.RegisterGetFilesHandler(b.wsServer.eventRouter)
	event_handler.RegisterGetFileHandler(b.wsServer.eventRouter)
	event_handler.RegisterGetSettingsHandler(b.wsServer.eventRouter)
	event_handler.RegisterKeyboardKeypressHandler(b.wsServer.eventRouter)
	event_handler.RegisterKeyboardTextHandler(b.wsServer.eventRouter)
	event_handler.RegisterMediaControlHandler(b.wsServer.eventRouter)
	event_handler.RegisterNotificationHandler(b.wsServer.eventRouter)
	event_handler.RegisterOpenHandler(b.wsServer.eventRouter)
	event_handler.RegisterPowerHibernateHandler(b.wsServer.eventRouter)
	event_handler.RegisterPowerLockHandler(b.wsServer.eventRouter)
	event_handler.RegisterPowerLogoutHandler(b.wsServer.eventRouter)
	event_handler.RegisterPowerRestartHandler(b.wsServer.eventRouter)
	event_handler.RegisterPowerShutdownHandler(b.wsServer.eventRouter)
	event_handler.RegisterPowerSleepHandler(b.wsServer.eventRouter)
	event_handler.RegisterRegisterDataListenerHandler(b.wsServer.eventRouter)
	event_handler.RegisterUnregisterDataListenerHandler(b.wsServer.eventRouter)
	event_handler.RegisterUpdateSettingsHandler(b.wsServer.eventRouter)

	// Create a new HTTP server mux
	mux := http.NewServeMux()

	// Set up WebSocket endpoint
	mux.HandleFunc("/api/websocket", func(w http.ResponseWriter, r *http.Request) {
		_, err := b.wsServer.HandleConnection(w, r)
		if err != nil {
			log.Error("WebSocket connection error:", err)
			http.Error(w, "WebSocket connection failed", http.StatusInternalServerError)
			return
		}
	})

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%d", b.config.API.Port),
		Handler: mux,
	}

	// Start server in a goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("Server error:", err)
		}
	}()

	log.Info("Backend server is running on", "address", server.Addr)

	// Wait for context cancellation
	<-ctx.Done()

	log.Info("Backend server is shutting down...")
	return server.Shutdown(ctx)
}
