package websocket

import (
	"net/http"
	"sync"

	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/backend/data"
	data_module "github.com/timmo001/system-bridge/backend/data/module"
	"github.com/timmo001/system-bridge/backend/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

// WebSocketRequest represents the structure of messages sent over the WebSocket
// Extends event.Message to include a token
type WebSocketRequest struct {
	// event.Message fields
	ID    string `json:"id" mapstructure:"id"`
	Event string `json:"event" mapstructure:"event"`
	Data  any    `json:"data" mapstructure:"data"`
	// WebSocketRequest fields
	Token string `json:"token" mapstructure:"token"`
}

type WebsocketServer struct {
	token         string
	upgrader      websocket.Upgrader
	connections   map[*websocket.Conn]bool
	dataListeners map[string][]types.ModuleName
	mutex         sync.RWMutex
	EventRouter   *event.MessageRouter
}

func NewWebsocketServer(settings *settings.Settings, dataStore *data.DataStore, eventRouter *event.MessageRouter) *WebsocketServer {
	ws := &WebsocketServer{
		token:         settings.API.Token,
		connections:   make(map[*websocket.Conn]bool),
		dataListeners: make(map[string][]types.ModuleName),
		EventRouter:   eventRouter,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for now
			},
		},
	}
	SetInstance(ws)
	return ws
}

// AddConnection adds a new WebSocket connection
func (ws *WebsocketServer) AddConnection(conn *websocket.Conn) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()
	ws.connections[conn] = true
}

// RemoveConnection removes a WebSocket connection
func (ws *WebsocketServer) RemoveConnection(conn *websocket.Conn) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()
	delete(ws.connections, conn)
	delete(ws.dataListeners, conn.RemoteAddr().String())
}

// Broadcast sends a message to all connected clients
func (ws *WebsocketServer) Broadcast(response event.MessageResponse) {
	ws.mutex.RLock()
	defer ws.mutex.RUnlock()

	for conn := range ws.connections {
		if err := conn.WriteJSON(response); err != nil {
			// If there's an error, remove the connection
			conn.Close()
			delete(ws.connections, conn)
		}
	}
}

type RegisterResponse int

const (
	RegisterResponseAdded  RegisterResponse = 1
	RegisterResponseExists RegisterResponse = 2
)

// RegisterDataListener allows a client to receive module data updates
func (ws *WebsocketServer) RegisterDataListener(connection string, modules []types.ModuleName) RegisterResponse {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	if _, ok := ws.dataListeners[connection]; ok {
		return RegisterResponseExists
	}

	log.Infof("Registering data listener for %s", connection)
	ws.dataListeners[connection] = modules
	return RegisterResponseAdded
}

// UnregisterDataListener allows a client to stop receiving module data updates
func (ws *WebsocketServer) UnregisterDataListener(connection string) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	log.Infof("Unregistering data listener for %s", connection)
	delete(ws.dataListeners, connection)
}

// BroadcastModuleUpdate sends a module data update to all connected clients
func (ws *WebsocketServer) BroadcastModuleUpdate(connection string, module data_module.Module) {
	ws.mutex.RLock()
	defer ws.mutex.RUnlock()

	response := event.MessageResponse{
		ID:      "system",
		Type:    event.ResponseTypeDataUpdate,
		Subtype: event.ResponseSubtypeNone,
		Data:    module.Data,
		Module:  module.Module,
	}

	log.Infof("Broadcasting module update for %s", module.Module)

	for conn := range ws.connections {
		if _, ok := ws.dataListeners[connection]; ok {
			if err := conn.WriteJSON(response); err != nil {
				// If there's an error, remove the connection
				conn.Close()
				delete(ws.connections, conn)
			}
		}
	}
}
