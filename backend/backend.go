package backend

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"log/slog"

	api_http "github.com/timmo001/system-bridge/backend/http"
	"github.com/timmo001/system-bridge/backend/mcp"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/discovery"
	"github.com/timmo001/system-bridge/event"
	event_handler "github.com/timmo001/system-bridge/event/handler"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/command"
	"github.com/timmo001/system-bridge/version"
)

type Backend struct {
	settings         *settings.Settings
	dataStore        *data.DataStore
	eventRouter      *event.MessageRouter
	wsServer         *websocket.WebsocketServer
	webClientContent *embed.FS
	discoveryManager *discovery.DiscoveryManager
	token            string
}

func New(settings *settings.Settings, dataStore *data.DataStore, token string, webClientContent *embed.FS) *Backend {
	// Initialize the EventBus
	_ = bus.GetInstance()
	slog.Info("EventBus initialized")

	eventRouter := event.NewMessageRouter()
	wsServer := websocket.NewWebsocketServer(token, dataStore, eventRouter)

	// Initialize discovery manager
	discoveryManager := discovery.NewDiscoveryManager(utils.GetPort())

	return &Backend{
		settings:         settings,
		dataStore:        dataStore,
		eventRouter:      eventRouter,
		wsServer:         wsServer,
		webClientContent: webClientContent,
		discoveryManager: discoveryManager,
		token:            token,
	}
}

func spaFileServer(staticFS fs.FS, indexFile string) http.HandlerFunc {
	fileServer := http.FileServer(http.FS(staticFS))
	return func(w http.ResponseWriter, r *http.Request) {
		requestedPath := strings.TrimPrefix(r.URL.Path, "/")
		if requestedPath == "" {
			requestedPath = indexFile
		}
		_, err := staticFS.Open(requestedPath)
		if err != nil {
			// If not found, serve index.html
			r.URL.Path = "/" + indexFile
		}
		fileServer.ServeHTTP(w, r)
	}
}

func (b *Backend) Run(ctx context.Context) error {
	slog.Info("Starting backend server...")

	// Create a context that can be canceled
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Set the server context for command execution
	// This ensures all commands are killed when the server shuts down
	command.SetServerContext(ctx)

	// Setup event handlers
	event_handler.RegisterHandlers(b.eventRouter, b.dataStore)

	// Create a new HTTP server mux
	mux := http.NewServeMux()

	// Create a file system that's rooted at the web-client/dist directory
	subFS, err := fs.Sub(b.webClientContent, "web-client/dist")
	if err != nil {
		slog.Warn("Failed to create sub filesystem. Web client will not be served.", "err", err)
	} else {
		mux.HandleFunc("/", spaFileServer(subFS, "index.html"))
	}

	// Set up WebSocket endpoint
	mux.HandleFunc("/api/websocket", func(w http.ResponseWriter, r *http.Request) {
		_, err := b.wsServer.HandleConnection(w, r)
		if err != nil {
			slog.Error("WebSocket connection error", "error", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			if err := json.NewEncoder(w).Encode(map[string]string{"error": "WebSocket connection failed"}); err != nil {
				slog.Error("Failed to encode response", "error", err)
			}
			return
		}
	})

	// Set up MCP WebSocket endpoint
	mcpServer := mcp.NewMCPServer(b.token, b.eventRouter, b.dataStore)
	mux.HandleFunc("/api/mcp", func(w http.ResponseWriter, r *http.Request) {
		if err := mcpServer.HandleConnection(w, r); err != nil {
			slog.Error("MCP connection error", "error", err)
		}
	})

	// Set up API endpoint
	mux.HandleFunc("/api", api_http.HandleAPI)
	// Set up module data endpoint
	mux.HandleFunc("/api/data/", api_http.GetModuleDataHandler(
		b.dataStore,
	))

	// Set up health check endpoint
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		healthResponse := map[string]interface{}{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   version.Version,
		}
		if err := json.NewEncoder(w).Encode(healthResponse); err != nil {
			slog.Error("Failed to encode health response", "error", err)
		}
	})

	mux.HandleFunc("/information", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Not found"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
	})

	mux.HandleFunc("/api/media/file/data", api_http.ServeMediaFileDataHandler)

	// Get port from environment variable with default
	port := utils.GetPort()

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%d", port),
		Handler: mux,
	}
	defer func() {
		err = server.Shutdown(ctx)
		if err != nil {
			slog.Error("Failed to Shutdown HTTP server", "error", err)
		}
	}()

	// Create an error channel to capture server errors
	errChan := make(chan error, 1)

	// Start server in a goroutine
	go func() {
		slog.Info("Backend server is running on", "address", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
			cancel()
		}
	}()

	// Start service discovery
	if err := b.discoveryManager.Start(); err != nil {
		slog.Warn("Failed to start discovery manager", "err", err)
	} else {
		slog.Info("Service discovery started")
	}

	defer func() {
		if err := b.discoveryManager.Stop(); err != nil {
			slog.Error("Failed to stop discovery manager", "err", err)
		}
	}()

	// All discovery services (SSDP, mDNS) are now managed by the discovery manager

	// Run data update task processor in a separate goroutine
	go func() {
		// Run continuously - the processor will handle its own lifecycle
		data.RunUpdateTaskProcessor(b.dataStore)
		slog.Info("Data update task processor completed")
	}()

	// Wait for either context cancellation or server error
	select {
	case <-ctx.Done():
		slog.Info("Backend server is shutting down...")
	case err := <-errChan:
		slog.Error("Server error caused shutdown:", "err", err)
	}

	return nil
}
