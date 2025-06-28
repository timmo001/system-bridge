package backend

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"time"

	"github.com/charmbracelet/log"
	api_http "github.com/timmo001/system-bridge/backend/http"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	event_handler "github.com/timmo001/system-bridge/event/handler"
	"github.com/timmo001/system-bridge/settings"
)

type Backend struct {
	settings         *settings.Settings
	dataStore        *data.DataStore
	eventRouter      *event.MessageRouter
	wsServer         *websocket.WebsocketServer
	webClientContent *embed.FS
}

func New(settings *settings.Settings, dataStore *data.DataStore, webClientContent *embed.FS) *Backend {
	// Initialize the EventBus
	_ = bus.GetInstance()
	log.Info("EventBus initialized")

	eventRouter := event.NewMessageRouter(settings)
	wsServer := websocket.NewWebsocketServer(settings, dataStore, eventRouter)

	return &Backend{
		settings:         settings,
		dataStore:        dataStore,
		eventRouter:      eventRouter,
		wsServer:         wsServer,
		webClientContent: webClientContent,
	}
}

func (b *Backend) Run(ctx context.Context) error {
	log.Info("Starting backend server...")

	// Create a context that can be canceled
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Setup event handlers
	event_handler.RegisterHandlers(b.eventRouter)

	// Create a file system that's rooted at the web-client/out directory
	subFS, err := fs.Sub(b.webClientContent, "web-client/out")
	if err != nil {
		log.Fatal("Failed to create sub filesystem:", err)
	}
	// Create a new HTTP server mux
	mux := http.NewServeMux()

	mux.Handle("/", http.FileServer(http.FS(subFS)))

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
	// Set up commands endpoint
	mux.HandleFunc("/api/commands", api_http.HandleCommands)
	// Set up module data endpoint
	mux.HandleFunc("/api/data/", api_http.GetModuleDataHandler(
		b.settings,
		b.dataStore,
	))
	// TODO: http endpoints (/api healthcheck, get file etc.)

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%d", b.settings.API.Port),
		Handler: mux,
	}

	// Create an error channel to capture server errors
	errChan := make(chan error, 1)

	// Start server in a goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
			cancel()
		}
		log.Info("Backend server is running on", "address", server.Addr)
	}()

	// TODO: MDNS / SSDP / DHCP discovery

	// Run data update task processor in a separate goroutine
	go func() {
		// Run immediately on startup
		data.RunUpdateTaskProcessor(b.dataStore)
		log.Info("Initial data update task processor completed")

		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				data.RunUpdateTaskProcessor(b.dataStore)
				log.Info("Data update task processor completed")
			}
		}
	}()

	// Wait for either context cancellation or server error
	select {
	case <-ctx.Done():
		log.Info("Backend server is shutting down...")
	case err := <-errChan:
		log.Error("Server error caused shutdown:", "err", err)
	}

	return server.Shutdown(ctx)
}
