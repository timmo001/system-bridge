package websocket

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
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

	// Subscribe to module data updates
	eb := bus.GetInstance()
	eb.Subscribe(bus.EventGetDataModule, "websocket", ws.handleGetDataModule)
	eb.Subscribe(bus.EventDataModuleUpdate, "websocket", ws.handleDataModuleUpdate)

	return ws
}
