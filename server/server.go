package server

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
	"github.com/timmo001/system-bridge/types"
)

type Server struct {
	DataStore           *data.DataStore
	EventMessageRouter  types.MessageRouter
	EventMessageHandler *event_handler.MessageHandler
	Settings            *settings.Settings
	WebsocketServer     *websocket.WebsocketServer
}

// Ensure Server implements types.Server interface
var _ types.Server = (*Server)(nil)

func New(settings *settings.Settings, dataStore *data.DataStore) *Server {
	return &Server{
		DataStore: dataStore,
		Settings:  settings,
	}
}

// GetSettings implements types.Server
func (s *Server) GetSettings() *settings.Settings {
	return s.Settings
}

// GetDataStore implements types.Server
func (s *Server) GetDataStore() *data.DataStore {
	return s.DataStore
}

// GetEventMessageRouter implements types.Server
func (s *Server) GetEventMessageRouter() types.MessageRouter {
	return s.EventMessageRouter
}

func (s *Server) Run(ctx context.Context) error {
	log.Info("Running server...")

	s.EventMessageRouter = event.NewMessageRouter(s)
	s.EventMessageHandler = event_handler.NewMessageHandler(s)
	s.WebsocketServer = websocket.NewWebsocketServer(s)

	// Create a new HTTP server mux
	mux := http.NewServeMux()

	// Set up WebSocket endpoint
	mux.HandleFunc("/api/websocket", func(w http.ResponseWriter, r *http.Request) {
		_, err := s.WebsocketServer.HandleConnection(w, r)
		if err != nil {
			log.Error("WebSocket connection error:", err)
			http.Error(w, "WebSocket connection failed", http.StatusInternalServerError)
			return
		}
	})

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%d", s.Settings.API.Port),
		Handler: mux,
	}

	// TODO: http endpoints (/api healthcheck, get file etc.)

	// Start server in a goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("Server error:", err)
		}
	}()

	log.Info("Server is running on", "address", server.Addr)

	// TODO: MDNS / SSDP / DHCP discovery

	// TODO: Listeners

	// Run data update task processor every 30 seconds
	go func() {
		for {
			data.RunUpdateTaskProcessor(s.DataStore)
			log.Info("Data update task processor completed")
			log.Info("Sleeping for 30 seconds...")
			time.Sleep(30 * time.Second)
		}
	}()

	// Wait for context cancellation
	<-ctx.Done()

	log.Info("Server is shutting down...")
	return server.Shutdown(ctx)
}
