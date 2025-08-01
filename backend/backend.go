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

func New(settings *settings.Settings, dataStore *data.DataStore, token string, webClientContent *embed.FS) *Backend {
	// Initialize the EventBus
	_ = bus.GetInstance()
	slog.Info("EventBus initialized")

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

	// Setup event handlers
	event_handler.RegisterHandlers(b.eventRouter)

	// Create a new HTTP server mux
	mux := http.NewServeMux()

	// Create a file system that's rooted at the web-client/out directory
	subFS, err := fs.Sub(b.webClientContent, "web-client/out")
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

	// Set up API endpoint
	mux.HandleFunc("/api", api_http.HandleAPI)
	// Set up module data endpoint
	mux.HandleFunc("/api/data/", api_http.GetModuleDataHandler(
		b.dataStore,
	))
	mux.HandleFunc("/information", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "Not found"}); err != nil {
			slog.Error("Failed to encode response", "error", err)
		}
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
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
			cancel()
		}
		slog.Info("Backend server is running on", "address", server.Addr)
	}()

	// TODO: MDNS / SSDP / DHCP discovery

	// Run data update task processor in a separate goroutine
	go func() {
		// Run immediately on startup
		data.RunUpdateTaskProcessor(b.dataStore)
		slog.Info("Initial data update task processor completed")

		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				data.RunUpdateTaskProcessor(b.dataStore)
				slog.Info("Data update task processor completed")
			}
		}
	}()

	// Wait for either context cancellation or server error
	select {
	case <-ctx.Done():
		slog.Info("Backend server is shutting down...")
	case err := <-errChan:
		slog.Error("Server error caused shutdown:", "err", err)
	}

	return server.Shutdown(ctx)
}
