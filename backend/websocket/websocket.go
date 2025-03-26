package websocket

import (
	"net/http"

	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/backend/event"
	"github.com/timmo001/system-bridge/settings"
	types_event "github.com/timmo001/system-bridge/shared/types/event"
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
		token:       settings.API.Token,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for now
			},
		},
	}
}

func (ws *WebsocketServer) HandleConnection(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error("Failed to upgrade connection:", err)
		return nil, err
	}

	// Start a goroutine to handle messages from this connection
	go ws.handleMessages(conn)

	return conn, nil
}

func (ws *WebsocketServer) SendMessage(conn *websocket.Conn, message types_event.MessageResponse) {
	if err := conn.WriteJSON(message); err != nil {
		log.Error("Failed to send response:", err)
	}
}

func (ws *WebsocketServer) SendError(conn *websocket.Conn, msg WebSocketRequest, subtype types_event.ResponseSubtype, message string) {
	response := types_event.MessageResponse{
		ID:      msg.ID,
		Type:    types_event.ResponseTypeError,
		Subtype: subtype,
		Data:    map[string]string{},
		Message: message,
	}
	ws.SendMessage(conn, response)
}

func (ws *WebsocketServer) HandleClose(conn *websocket.Conn) {
	conn.Close()
}

func (ws *WebsocketServer) HandleError(conn *websocket.Conn, err error) {
	log.Error("WebSocket error:", err)
	ws.SendError(conn,
		WebSocketRequest{
			ID:    "unknown",
			Event: "unknown",
			Data:  map[string]string{},
		},
		types_event.ResponseSubtypeNone,
		err.Error(),
	)
}
