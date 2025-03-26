package backend

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/backend/event"
	event_handler "github.com/timmo001/system-bridge/backend/event/handler"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/settings"
)

type Backend struct {
	dataStore           *data.DataStore
	eventMessageHandler *event_handler.MessageHandler
	settings            *settings.Settings
	wsServer            *websocket.WebsocketServer
}

func New(settings *settings.Settings, dataStore *data.DataStore) *Backend {
	wsServer := websocket.NewWebsocketServer(settings, dataStore)
	eventMessageHandler := event_handler.NewMessageHandler(event.NewMessageRouter(settings, dataStore, wsServer))

	return &Backend{
		dataStore:           dataStore,
		eventMessageHandler: eventMessageHandler,
		settings:            settings,
		wsServer:            wsServer,
	}
}

func (b *Backend) Run(ctx context.Context) error {
	log.Info("Running backend server...")

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

	// TODO: http endpoints (/api healthcheck, get file etc.)

	// Start server in a goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("Server error:", err)
		}
	}()

	log.Info("Backend server is running on", "address", server.Addr)

	// TODO: MDNS / SSDP / DHCP discovery

	// TODO: Listeners

	// Run data update task processor every 30 seconds
	go func() {
		for {
			data.RunUpdateTaskProcessor(b.dataStore)
			log.Info("Data update task processor completed")
			log.Info("Sleeping for 30 seconds...")
			time.Sleep(30 * time.Second)
		}
	}()

	// Wait for context cancellation
	<-ctx.Done()

	log.Info("Backend server is shutting down...")
	return server.Shutdown(ctx)
}
