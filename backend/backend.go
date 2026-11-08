package backend

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
	"time"

	"log/slog"

	api_http "github.com/timmo001/system-bridge/backend/http"
	"github.com/timmo001/system-bridge/backend/mcp"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/audio"
	"github.com/timmo001/system-bridge/data/module/battery"
	"github.com/timmo001/system-bridge/data/module/bluetooth"
	"github.com/timmo001/system-bridge/data/module/cameras"
	"github.com/timmo001/system-bridge/data/module/desktop"
	"github.com/timmo001/system-bridge/data/module/displays"
	"github.com/timmo001/system-bridge/data/module/media"
	"github.com/timmo001/system-bridge/data/module/networks"
	"github.com/timmo001/system-bridge/data/module/system"
	"github.com/timmo001/system-bridge/discord"
	"github.com/timmo001/system-bridge/discovery"
	"github.com/timmo001/system-bridge/event"
	event_handler "github.com/timmo001/system-bridge/event/handler"
	"github.com/timmo001/system-bridge/push"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/command"
	"github.com/timmo001/system-bridge/utils/handlers/notification"
	"github.com/timmo001/system-bridge/utils/handlers/power"
	"github.com/timmo001/system-bridge/version"
)

const readHeaderTimeout = 10 * time.Second

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

// The web client's PWA manifest, which Go's table doesn't know
func init() {
	if err := mime.AddExtensionType(".webmanifest", "application/manifest+json"); err != nil {
		slog.Warn("Failed to register the web manifest type", "error", err)
	}
}

// spaFileServer serves the web client. Files are served as they are. Any
// other path is a page of the client, such as /data/cpu, so it gets the index
// page at that same URL and the client's router shows the page; a reload or a
// shared link lands where it was. Paths that look like files, or are under
// /api/, get a 404 instead, so a missing script isn't answered with a page.
func spaFileServer(staticFS fs.FS, indexFile string) http.HandlerFunc {
	fileServer := http.FileServer(http.FS(staticFS))
	return func(w http.ResponseWriter, r *http.Request) {
		requestedPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")

		if requestedPath != "" {
			if info, err := fs.Stat(staticFS, requestedPath); err == nil && !info.IsDir() {
				// Vite names built assets by their content, so they never change
				if strings.HasPrefix(requestedPath, "assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					w.Header().Set("Cache-Control", "no-cache")
				}
				fileServer.ServeHTTP(w, r)
				return
			}

			if strings.HasPrefix(requestedPath, "api/") || path.Ext(requestedPath) != "" {
				http.NotFound(w, r)
				return
			}
		}

		// Serve the index without changing the URL. Rewriting the path to
		// /index.html would make the file server redirect to the root.
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFileFS(w, r, staticFS, indexFile)
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

	desktop.OnHyprlandEvent(func(hyprlandEvent types.HyprlandEvent) {
		b.wsServer.BroadcastModuleEvent(types.ModuleDesktop, event.MessageResponse{
			ID:      "system",
			Type:    event.ResponseTypeHyprlandEvent,
			Subtype: event.ResponseSubtypeNone,
			Data:    hyprlandEvent,
			Module:  types.ModuleDesktop,
		})
	})

	// Phones and browsers subscribed to pushes hear about notifications and
	// releases while they're closed. Without the store the backend runs as
	// before, with no push routes.
	pushStore, err := push.Load()
	if err != nil {
		slog.Warn("Failed to load push subscriptions, so nothing will be pushed", "error", err)
	} else {
		go push.WatchUpdates(ctx, pushStore)
	}

	// Every client hears when a notification System Bridge sent is sent,
	// clicked or closes, as it may have sent it
	notification.OnEvent(func(e notification.Event) {
		b.wsServer.BroadcastMessage(event_handler.NotificationEventResponse(e))
		if e.Sent && pushStore != nil {
			go pushStore.Send(ctx, push.KindNotifications, push.Payload{
				Title: e.Title,
				Body:  e.Message,
				Tag:   fmt.Sprintf("notification-%d", e.ID),
				Link:  "/system#notifications",
			})
		}
	})
	defer notification.OnEvent(nil)

	// Clients hear before the host sleeps or shuts down, so they can mark it
	// unavailable at once, and again when it wakes
	go power.WatchSleep(ctx, func(state types.PowerState) {
		slog.Info("Power state changed", "state", state)
		b.wsServer.BroadcastMessage(event.MessageResponse{
			ID:      "system",
			Type:    event.ResponseTypePowerStateChanged,
			Subtype: event.ResponseSubtypeNone,
			Data:    types.PowerStateEvent{State: state},
		})
		if state == types.PowerStateResumed {
			b.discoveryManager.Announce()
		}
	})

	// These modules follow changes on the system, so they update as soon as
	// one happens rather than on their next refresh
	for module, watch := range map[types.ModuleName]func(context.Context, func()){
		types.ModuleAudio:     audio.Watch,
		types.ModuleBattery:   battery.Watch,
		types.ModuleBluetooth: bluetooth.Watch,
		types.ModuleCameras:   cameras.Watch,
		types.ModuleDesktop:   desktop.Watch,
		types.ModuleDisplays:  displays.Watch,
		types.ModuleMedia:     media.Watch,
		types.ModuleNetworks:  networks.Watch,
		types.ModuleSystem:    system.Watch,
	} {
		go watch(ctx, func() {
			if err := b.dataStore.TriggerModuleUpdate(module); err != nil {
				slog.Warn("Failed to update module data", "module", module, "error", err)
			}
		})
	}

	go discord.Run(ctx, func(d types.DiscordData) {
		if err := b.dataStore.SetModuleData(types.ModuleDiscord, d); err != nil {
			slog.Warn("Failed to update Discord module data", "error", err)
		}
	})

	// Create a new HTTP server mux
	mux := http.NewServeMux()
	mux.HandleFunc("/api/quit", api_http.QuitHandler(b.token, cancel))

	// Pairing hands a phone the API token for a one-time code from a QR code
	pairCodes := api_http.NewPairCodes()
	mux.HandleFunc("/api/pair/code", api_http.AllowOrigins(api_http.PairCodeHandler(b.token, pairCodes)))
	mux.HandleFunc("/api/pair", api_http.AllowOrigins(api_http.PairHandler(b.token, pairCodes, api_http.ThisService())))

	// One event over HTTP, for what has no WebSocket, such as a phone's tiles
	mux.HandleFunc("/api/event", api_http.AllowOrigins(api_http.EventHandler(b.token, b.eventRouter)))

	if pushStore != nil {
		mux.HandleFunc("/api/push/vapid-key", api_http.AllowOrigins(api_http.PushVAPIDKeyHandler(b.token, pushStore)))
		mux.HandleFunc("/api/push/subscriptions", api_http.AllowOrigins(api_http.PushSubscriptionsHandler(b.token, pushStore)))
		mux.HandleFunc("/api/push/preferences", api_http.AllowOrigins(api_http.PushPreferencesHandler(b.token, pushStore)))
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

	// Set up MCP endpoint
	mcpServer := mcp.NewMCPServer(b.token, b.eventRouter, b.dataStore)
	mux.Handle("/api/mcp", mcpServer)

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

	// Set up SPA file server (must be last to avoid catching API routes)
	subFS, err := fs.Sub(b.webClientContent, "client/web/dist")
	if err != nil {
		slog.Warn("Failed to create sub filesystem. Web client will not be served.", "err", err)
	} else {
		mux.HandleFunc("/", spaFileServer(subFS, "index.html"))
	}

	// Get port from environment variable with default
	port := utils.GetPort()

	// Create HTTP server
	server := &http.Server{
		Addr:              fmt.Sprintf("0.0.0.0:%d", port),
		Handler:           mux,
		ReadHeaderTimeout: readHeaderTimeout,
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

	// Discovery over mDNS is managed by the discovery manager

	// Run data update task processor in a separate goroutine
	go func() {
		// Run continuously - the processor will handle its own lifecycle
		data.RunUpdateTaskProcessor(b.dataStore)
		slog.Info("Data update task processor completed")
	}()

	// Save the history now and then, and when shutting down, so a restart
	// keeps it
	history := b.dataStore.History()
	go history.SaveEvery(ctx, 5*time.Minute)
	defer func() {
		if err := history.Save(); err != nil {
			slog.Warn("Failed to save history", "error", err)
		}
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
