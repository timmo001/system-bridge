package backend

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/charmbracelet/log"
	api_http "github.com/timmo001/system-bridge/backend/http"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	event_handler "github.com/timmo001/system-bridge/event/handler"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
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

	// Load token for WebSocket and HTTP auth
	token, err := utils.LoadToken()
	if err != nil {
		log.Errorf("error loading token: %v", err)
		// Return with error instead of fatal exit
		return nil
	}

	eventRouter := event.NewMessageRouter()
	wsServer := websocket.NewWebsocketServer(token, dataStore, eventRouter)

	return &Backend{
		settings:         settings,
		dataStore:        dataStore,
		eventRouter:      eventRouter,
		wsServer:         wsServer,
		webClientContent: webClientContent,
	}
}

func (b *Backend) Run(ctx context.Context) error {
	// Check if backend was properly initialized
	if b == nil {
		return fmt.Errorf("backend is not properly initialized")
	}
	
	log.Info("Starting backend server...")

	// Create a context that can be canceled
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Setup event handlers
	event_handler.RegisterHandlers(b.eventRouter)

	// Create a file system that's rooted at the web-client/out directory
	subFS, err := fs.Sub(b.webClientContent, "web-client/out")
	if err != nil {
		log.Errorf("Failed to create sub filesystem: %v", err)
		return fmt.Errorf("failed to create sub filesystem: %w", err)
	}
	// Create a new HTTP server mux
	mux := http.NewServeMux()

	mux.Handle("/", http.FileServer(http.FS(subFS)))

	// Set up WebSocket endpoint
	mux.HandleFunc("/api/websocket", func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("WebSocket handler panic recovered: %v", r)
				log.Errorf("Stack trace: %s", debug.Stack())
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			}
		}()
		
		if b.wsServer == nil {
			log.Error("WebSocket server is not initialized")
			http.Error(w, "WebSocket server unavailable", http.StatusServiceUnavailable)
			return
		}
		
		_, err := b.wsServer.HandleConnection(w, r)
		if err != nil {
			log.Error("WebSocket connection error:", err)
			http.Error(w, "WebSocket connection failed", http.StatusInternalServerError)
			return
		}
	})

	// Set up API endpoint
	mux.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("API handler panic recovered: %v", r)
				log.Errorf("Stack trace: %s", debug.Stack())
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			}
		}()
		api_http.HandleAPI(w, r)
	})
	
	// Set up module data endpoint
	mux.HandleFunc("/api/data/", func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Data API handler panic recovered: %v", r)
				log.Errorf("Stack trace: %s", debug.Stack())
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			}
		}()
		
		if b.dataStore == nil {
			log.Error("Data store is not initialized")
			http.Error(w, "Data store unavailable", http.StatusServiceUnavailable)
			return
		}
		
		handler := api_http.GetModuleDataHandler(b.dataStore)
		handler(w, r)
	})
	// TODO: http endpoints (/api healthcheck, get file etc.)

	// Get port from environment variable with default
	port := utils.GetPort()

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%d", port),
		Handler: mux,
	}

	// Create an error channel to capture server errors
	errChan := make(chan error, 1)

	// Start server in a goroutine
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("HTTP server goroutine panic recovered: %v", r)
				log.Errorf("Stack trace: %s", debug.Stack())
				errChan <- fmt.Errorf("server panic: %v", r)
			}
		}()
		
		log.Info("Backend server is running on", "address", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
			cancel()
		}
	}()

	// TODO: MDNS / SSDP / DHCP discovery

	// Run data update task processor in a separate goroutine
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Errorf("Data update processor goroutine panic recovered: %v", r)
				log.Errorf("Stack trace: %s", debug.Stack())
			}
		}()
		
		if b.dataStore == nil {
			log.Error("Data store is not initialized, skipping data updates")
			return
		}
		
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
				func() {
					defer func() {
						if r := recover(); r != nil {
							log.Errorf("Data update task processor panic recovered: %v", r)
						}
					}()
					data.RunUpdateTaskProcessor(b.dataStore)
					log.Info("Data update task processor completed")
				}()
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
