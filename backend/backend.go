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
	DataStore           *data.DataStore
	EventMessageRouter  *event.MessageRouter
	EventMessageHandler *event_handler.MessageHandler
	Settings            *settings.Settings
	WebsocketServer     *websocket.WebsocketServer
}

func New(settings *settings.Settings, dataStore *data.DataStore) *Backend {
  eventMessageRouter := event.NewMessageRouter(settings, dataStore)
	eventMessageHandler := event_handler.NewMessageHandler(eventMessageRouter)
	websocketServer := websocket.NewWebsocketServer(settings)

	return &Backend{
		DataStore:           dataStore,
		EventMessageRouter:  eventMessageRouter,
		EventMessageHandler: eventMessageHandler,
		Settings:            settings,
		WebsocketServer:     websocketServer,
	}
}

func (b *Backend) Run(ctx context.Context) error {
	log.Info("Running backend server...")

	// Create a new HTTP server mux
	mux := http.NewServeMux()

	// Set up WebSocket endpoint
	mux.HandleFunc("/api/websocket", func(w http.ResponseWriter, r *http.Request) {
		_, err := b.WebsocketServer.HandleConnection(w, r)
		if err != nil {
			log.Error("WebSocket connection error:", err)
			http.Error(w, "WebSocket connection failed", http.StatusInternalServerError)
			return
		}
	})

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%d", b.Settings.API.Port),
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
			data.RunUpdateTaskProcessor(b.DataStore)
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
