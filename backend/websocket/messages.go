package websocket

import (
	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
)

func (ws *WebsocketServer) SendMessage(conn *websocket.Conn, message event.MessageResponse) {
	log.Debug("Sending message to connection", "response", message)

	if err := conn.WriteJSON(message); err != nil {
		log.Error("Failed to send response:", err)
		// If there's an error, remove the connection
		if closeErr := conn.Close(); closeErr != nil {
			log.Error("Error closing connection:", closeErr)
		}
		delete(ws.connections, conn.RemoteAddr().String())
	}
}

func (ws *WebsocketServer) SendError(conn *websocket.Conn, req WebSocketRequest, subtype event.ResponseSubtype, message string) {
	response := event.MessageResponse{
		ID:      req.ID,
		Type:    event.ResponseTypeError,
		Subtype: subtype,
		Data:    map[string]string{},
		Message: message,
	}
	ws.SendMessage(conn, response)
}
