package websocket

import (
	"github.com/gorilla/websocket"
	types_event "github.com/timmo001/system-bridge/shared/types/event"
)

func (ws *WebsocketServer) SendMessage(conn *websocket.Conn, message interface{}) error {
	return conn.WriteJSON(message)
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
