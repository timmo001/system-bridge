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
	event_handler.RegisterExitHandler(b.wsServer.eventRouter)

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
