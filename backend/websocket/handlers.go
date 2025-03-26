package websocket

import (
	"encoding/json"
	"net/http"

	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/timmo001/system-bridge/backend/event"
)

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

func (ws *WebsocketServer) handleMessages(conn *websocket.Conn) {
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Error("WebSocket error:", err)
			}
			break
		}

		var msg WebSocketRequest
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Error("Failed to parse message:", err)
			ws.SendError(conn, msg, "invalid_message", "Failed to parse message")
			continue
		}

		// Validate token
		if msg.Token != ws.token {
			log.Error("Invalid token received")
			ws.SendError(conn, msg, "invalid_token", "Invalid token")
			continue
		}

		ws.HandleMessage(conn, message)
	}
}

func (ws *WebsocketServer) HandleMessage(conn *websocket.Conn, message []byte) {
	var msg WebSocketRequest
	if err := json.Unmarshal(message, &msg); err != nil {
		return
	}

	// Handle different event types
	log.Info("Received message", "event", msg.Event, "id", msg.ID)
	// Pass message to event handlers
	response := ws.EventRouter.HandleMessage(event.Message{
		ID:    msg.ID,
		Event: event.EventType(msg.Event),
		Data:  msg.Data,
	})
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
		event.ResponseSubtypeNone,
		err.Error(),
	)
}
