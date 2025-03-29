package websocket

import (
	"encoding/json"
	"net/http"

	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

func (ws *WebsocketServer) HandleConnection(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error("Failed to upgrade connection:", err)
		return nil, err
	}

	// Add the connection to our map
	ws.AddConnection(conn)

	// Start a goroutine to handle messages from this connection
	go ws.handleMessages(conn)

	return conn, nil
}

func (ws *WebsocketServer) handleMessages(conn *websocket.Conn) {
	defer func() {
		ws.RemoveConnection(conn)
		conn.Close()
	}()

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
	response := ws.EventRouter.HandleMessage(conn.RemoteAddr().String(), event.Message{
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


// handleGetDataModule handles module data updates from the event bus
func (ws *WebsocketServer) handleGetDataModule(event bus.Event) {
	log.Info("WS: event", "type", event.Type, "data", event.Data)
	if event.Type != bus.EventGetDataModule {
		return
	}

	var data bus.GetDataRequest
	if err := mapstructure.Decode(event.Data, &data); err != nil {
		log.Error("Failed to decode module data", "error", err)
		return
	}

	// // Register the data listener
	// response := ws.RegisterDataListener(data.Connection, data.Modules)
	// if response == RegisterResponseExists {
	// 	log.Infof("Data listener already exists for %s", data.Connection)
	// }

	for _, module := range data.Modules {
		m := ws.EventRouter.DataStore.GetModule(module)
		// Convert data_module.Module to types.Module
		moduleData := types.Module{
			Module: m.Module,
			Data:   m.Data,
		}
		ws.BroadcastModuleUpdate(moduleData, &data.Connection)
	}
}

// handleDataModuleUpdate handles module data updates from the event bus
func (ws *WebsocketServer) handleDataModuleUpdate(event bus.Event) {
	log.Info("WS: event", "type", event.Type)
	if event.Type != bus.EventDataModuleUpdate {
		return
	}

	var module types.Module
	if err := mapstructure.Decode(event.Data, &module); err != nil {
		log.Error("Failed to decode module data", "error", err)
		return
	}

	log.Info("Received module data update from event bus", "module", module.Module)

	// Broadcast to connected websocket clients
	ws.BroadcastModuleUpdate(module, nil)
}
