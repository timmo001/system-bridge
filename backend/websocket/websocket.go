package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/backend"
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
	token    string
	upgrader websocket.Upgrader
}

func NewWebsocketServer(b *backend.Backend) *WebsocketServer {
	return &WebsocketServer{
		token: b.Settings.API.Token,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for now
			},
		},
	}
}
