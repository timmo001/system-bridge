package websocket

import (
	"runtime/debug"

	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/event"
)

func (ws *WebsocketServer) SendMessage(connInfo *connectionInfo, message event.MessageResponse) {
	defer func() {
		if r := recover(); r != nil {
			log.Errorf("SendMessage panic recovered: %v", r)
			log.Errorf("Stack trace: %s", debug.Stack())
		}
	}()
	
	if connInfo == nil || connInfo.conn == nil {
		log.Error("Connection info or connection is nil")
		return
	}
	
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
		// Remove from connections and dataListeners if and only if the pointer matches
		go func(addr string, failedConn *websocket.Conn) {
			defer func() {
				if r := recover(); r != nil {
					log.Errorf("Connection cleanup panic recovered: %v", r)
				}
			}()
			
			if ws == nil {
				return
			}
			
			ws.mutex.Lock()
			defer ws.mutex.Unlock()
			connInfo, ok := ws.connections[addr]
			if ok && connInfo != nil && connInfo.conn == failedConn {
				delete(ws.connections, addr)
				delete(ws.dataListeners, addr)
			}
		}(connInfo.conn.RemoteAddr().String(), connInfo.conn)
	}
}

func (ws *WebsocketServer) SendError(conn *websocket.Conn, req WebSocketRequest, subtype event.ResponseSubtype, message string) {
	defer func() {
		if r := recover(); r != nil {
			log.Errorf("SendError panic recovered: %v", r)
			log.Errorf("Stack trace: %s", debug.Stack())
		}
	}()
	
	if ws == nil || conn == nil {
		log.Error("WebsocketServer or connection is nil")
		return
	}
	
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

	if ok && connInfo != nil {
		ws.SendMessage(connInfo, response)
	} else {
		log.Error("Connection not found in connections map", "addr", addr)
	}
}
