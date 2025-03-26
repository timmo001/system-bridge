package websocket

import (
	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/backend/event"
)

func (ws *WebsocketServer) SendMessage(conn *websocket.Conn, response event.MessageResponse) {
	if err := conn.WriteJSON(response); err != nil {
		log.Error("Failed to send response:", err)
	}
}

func (ws *WebsocketServer) SendError(conn *websocket.Conn, msg WebSocketRequest, subtype event.ResponseSubtype, message string) {
	response := event.MessageResponse{
		ID:      msg.ID,
		Type:    event.ResponseTypeError,
		Subtype: subtype,
		Data:    map[string]string{},
		Message: message,
	}
	ws.SendMessage(conn, response)
}
