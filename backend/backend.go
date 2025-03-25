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
	settings   *settings.Settings
	wsServer *WebsocketServer
}

func New(settings *settings.Settings) *Backend {
	return &Backend{
		settings: settings,
		wsServer: NewWebsocketServer(settings),
	}
}

func (b *Backend) Run(ctx context.Context) error {
	log.Info("Running backend server...")

	// Setup event handlers
	event_handler.RegisterDataUpdateHandler(b.wsServer.EventRouter)
	event_handler.RegisterExitApplicationHandler(b.wsServer.EventRouter)
	event_handler.RegisterGetDataHandler(b.wsServer.EventRouter)
	event_handler.RegisterGetDirectoriesHandler(b.wsServer.EventRouter)
	event_handler.RegisterGetFilesHandler(b.wsServer.EventRouter)
	event_handler.RegisterGetFileHandler(b.wsServer.EventRouter)
	event_handler.RegisterGetSettingsHandler(b.wsServer.EventRouter)
	event_handler.RegisterKeyboardKeypressHandler(b.wsServer.EventRouter)
	event_handler.RegisterKeyboardTextHandler(b.wsServer.EventRouter)
	event_handler.RegisterMediaControlHandler(b.wsServer.EventRouter)
	event_handler.RegisterNotificationHandler(b.wsServer.EventRouter)
	event_handler.RegisterOpenHandler(b.wsServer.EventRouter)
	event_handler.RegisterPowerHibernateHandler(b.wsServer.EventRouter)
	event_handler.RegisterPowerLockHandler(b.wsServer.EventRouter)
	event_handler.RegisterPowerLogoutHandler(b.wsServer.EventRouter)
	event_handler.RegisterPowerRestartHandler(b.wsServer.EventRouter)
	event_handler.RegisterPowerShutdownHandler(b.wsServer.EventRouter)
	event_handler.RegisterPowerSleepHandler(b.wsServer.EventRouter)
	event_handler.RegisterRegisterDataListenerHandler(b.wsServer.EventRouter)
	event_handler.RegisterUnregisterDataListenerHandler(b.wsServer.EventRouter)
	event_handler.RegisterUpdateSettingsHandler(b.wsServer.EventRouter)

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
		Addr:    fmt.Sprintf("0.0.0.0:%d", b.settings.API.Port),
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
