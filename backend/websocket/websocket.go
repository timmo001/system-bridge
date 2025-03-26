package websocket

import (
	"net/http"

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
	EventRouter *event.MessageRouter
	token       string
	upgrader    websocket.Upgrader
}

func NewWebsocketServer(settings *settings.Settings, dataStore *data.DataStore) *WebsocketServer {
	return &WebsocketServer{
		EventRouter: event.NewMessageRouter(settings, dataStore),
		token:       settings.API.Token,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for now
			},
		},
	}
}
