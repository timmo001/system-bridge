package websocket

import (
	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
)

func (ws *WebsocketServer) SendMessage(connInfo *connectionInfo, message event.MessageResponse) {
	log.Debug("Sending message to connection", "response", message)

	// Use per-connection mutex to prevent concurrent writes
	connInfo.writeMux.Lock()
	defer connInfo.writeMux.Unlock()

	if err := connInfo.conn.WriteJSON(message); err != nil {
		log.Error("Failed to send response:", err)
		// If there's an error, close the connection
		if closeErr := connInfo.conn.Close(); closeErr != nil {
			log.Error("Error closing connection:", closeErr)
		}
		// Remove from connections map in a new goroutine to avoid deadlock
		go func(addr string) {
			ws.mutex.Lock()
			delete(ws.connections, addr)
			ws.mutex.Unlock()
		}(connInfo.conn.RemoteAddr().String())
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

	// Find the connectionInfo for this connection
	ws.mutex.RLock()
	addr := conn.RemoteAddr().String()
	connInfo, ok := ws.connections[addr]
	ws.mutex.RUnlock()

	if ok {
		ws.SendMessage(connInfo, response)
	} else {
		log.Error("Connection not found in connections map", "addr", addr)
	}
}
