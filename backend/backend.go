package backend

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/charmbracelet/log"
	eventbus "github.com/timmo001/system-bridge/backend/bus"
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/backend/event"
	event_handler "github.com/timmo001/system-bridge/backend/event/handler"
	api_http "github.com/timmo001/system-bridge/backend/http"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/settings"
)

type Backend struct {
	settings    *settings.Settings
	dataStore   *data.DataStore
	eventRouter *event.MessageRouter
	wsServer    *websocket.WebsocketServer
}

func New(settings *settings.Settings, dataStore *data.DataStore) *Backend {
	// Initialize the EventBus
	_ = eventbus.GetInstance()
	log.Info("EventBus initialized")

	eventRouter := event.NewMessageRouter(settings, dataStore)
	wsServer := websocket.NewWebsocketServer(settings, dataStore, eventRouter)

	return &Backend{
		settings:    settings,
		dataStore:   dataStore,
		eventRouter: eventRouter,
		wsServer:    wsServer,
	}
}

func (b *Backend) Run(ctx context.Context) error {
	log.Info("Starting backend server...")

	// Setup event handlers
	event_handler.RegisterHandlers(b.eventRouter)

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

	// Set up API endpoint
	mux.HandleFunc("/api", api_http.HandleAPI)
	// Set up module data endpoint
	mux.HandleFunc("/api/data/", api_http.GetModuleDataHandler(b.eventRouter))
	// TODO: http endpoints (/api healthcheck, get file etc.)

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

	// TODO: MDNS / SSDP / DHCP discovery

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
