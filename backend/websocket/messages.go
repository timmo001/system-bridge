package websocket

import (
	"encoding/json"
	"log/slog"

	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
)

func (ws *WebsocketServer) SendMessage(connInfo *connectionInfo, message event.MessageResponse) {
	ws.SendMessageWithLock(connInfo, message, false)
}

func (ws *WebsocketServer) SendMessageWithLock(connInfo *connectionInfo, message event.MessageResponse, lockHeld bool) {
	payload, err := json.Marshal(message)
	if err != nil {
		slog.Error("Failed to encode response", "error", err, "message_id", message.ID)
		return
	}
	ws.sendPayloadWithLock(connInfo, payload, lockHeld)
}

// sendPayloadWithLock writes an already encoded message. Broadcasts encode
// once and reuse the bytes for every listener instead of encoding the module
// data again per connection.
func (ws *WebsocketServer) sendPayloadWithLock(connInfo *connectionInfo, payload []byte, lockHeld bool) {
	// Use per-connection mutex to prevent concurrent writes
	connInfo.writeMux.Lock()
	defer connInfo.writeMux.Unlock()

	// Handle test connections with nil conn (used in unit tests)
	if connInfo.conn == nil {
		slog.Debug("Skipping message send to test connection")
		return
	}

	if err := connInfo.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
		slog.Error("Failed to send response", "error", err)
		// If there's an error, close the connection
		if closeErr := connInfo.conn.Close(); closeErr != nil {
			slog.Error("Error closing connection", "error", closeErr)
		}

		// Remove from connections and dataListeners if and only if the pointer matches
		if lockHeld {
			// If we already hold the lock, do the cleanup synchronously
			addr := connInfo.conn.RemoteAddr().String()
			if existingConnInfo, ok := ws.connections[addr]; ok && existingConnInfo.conn == connInfo.conn {
				delete(ws.connections, addr)
				delete(ws.dataListeners, addr)
			}
		} else {
			// Otherwise, spawn a goroutine to acquire the lock
			go func(addr string, failedConn *websocket.Conn) {
				ws.mutex.Lock()
				defer ws.mutex.Unlock()
				connInfo, ok := ws.connections[addr]
				if ok && connInfo.conn == failedConn {
					delete(ws.connections, addr)
					delete(ws.dataListeners, addr)
				}
			}(connInfo.conn.RemoteAddr().String(), connInfo.conn)
		}
	}
}

// BroadcastMessage sends a message to every connection, for changes every
// client should hear about, such as the settings
func (ws *WebsocketServer) BroadcastMessage(message event.MessageResponse) {
	payload, err := json.Marshal(message)
	if err != nil {
		slog.Error("Failed to encode broadcast", "error", err, "type", message.Type)
		return
	}

	ws.mutex.RLock()
	connections := make([]*connectionInfo, 0, len(ws.connections))
	for _, connInfo := range ws.connections {
		connections = append(connections, connInfo)
	}
	ws.mutex.RUnlock()

	for _, connInfo := range connections {
		ws.sendPayloadWithLock(connInfo, payload, false)
	}
}

func (ws *WebsocketServer) SendMessageToAddress(address string, message event.MessageResponse) bool {
	// Find the connectionInfo for this address
	ws.mutex.RLock()
	connInfo, ok := ws.connections[address]
	ws.mutex.RUnlock()

	if ok {
		ws.SendMessage(connInfo, message)
		return true
	}

	slog.Error("Connection not found in connections map", "address", address)
	return false
}

func (ws *WebsocketServer) ConnectionExists(address string) bool {
	ws.mutex.RLock()
	_, ok := ws.connections[address]
	ws.mutex.RUnlock()
	return ok
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
		slog.Error("Connection not found in connections map", "addr", addr)
	}
}
