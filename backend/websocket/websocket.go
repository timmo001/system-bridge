package websocket

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/backend/event"
	"github.com/timmo001/system-bridge/settings"
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
	token       string
	upgrader    websocket.Upgrader
	connections map[*websocket.Conn]bool
	mutex       sync.RWMutex
	EventRouter *event.MessageRouter
}

func NewWebsocketServer(settings *settings.Settings, dataStore *data.DataStore) *WebsocketServer {
	return &WebsocketServer{
		token:       settings.API.Token,
		connections: make(map[*websocket.Conn]bool),
		EventRouter: event.NewMessageRouter(settings, dataStore),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for now
			},
		},
	}
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

// BroadcastModuleUpdate sends a module data update to all connected clients
func (ws *WebsocketServer) BroadcastModuleUpdate(moduleName string, data any) {
	response := event.MessageResponse{
		ID:      "system",
		Type:    event.ResponseTypeDataUpdate,
		Subtype: event.ResponseSubtypeNone,
		Data:    data,
		Module:  moduleName,
	}
	ws.Broadcast(response)
}
