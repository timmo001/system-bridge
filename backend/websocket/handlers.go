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
		if err := conn.Close(); err != nil {
			log.Error("Error closing connection:", err)
		}
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
}

// AddConnection adds a new WebSocket connection
func (ws *WebsocketServer) AddConnection(conn *websocket.Conn) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()
	ws.connections[conn] = true
}

// RemoveConnection removes a WebSocket connection
func (ws *WebsocketServer) RemoveConnection(conn *websocket.Conn) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()
	delete(ws.connections, conn)
	delete(ws.dataListeners, conn.RemoteAddr().String())
}

type RegisterResponse int

const (
	RegisterResponseAdded  RegisterResponse = 1
	RegisterResponseExists RegisterResponse = 2
)

// RegisterDataListener allows a client to receive module data updates
func (ws *WebsocketServer) RegisterDataListener(connection string, modules []types.ModuleName) RegisterResponse {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	if _, ok := ws.dataListeners[connection]; ok {
		return RegisterResponseExists
	}

	log.Infof("Registering data listener for %s", connection)
	ws.dataListeners[connection] = modules
	return RegisterResponseAdded
}

// UnregisterDataListener allows a client to stop receiving module data updates
func (ws *WebsocketServer) UnregisterDataListener(connection string) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	log.Infof("Unregistering data listener for %s", connection)
	delete(ws.dataListeners, connection)
}

// BroadcastModuleUpdate sends a module data update to all connected clients
func (ws *WebsocketServer) BroadcastModuleUpdate(module types.Module, connection *string) {
	ws.mutex.RLock()
	defer ws.mutex.RUnlock()

	response := event.MessageResponse{
		ID:      "system",
		Type:    event.ResponseTypeDataUpdate,
		Subtype: event.ResponseSubtypeNone,
		Data:    module.Data,
		Module:  module.Module,
	}

	if module.Data == nil {
		log.Warn("Broadcasting module update with no data", "module", module.Module, "data", module.Data)
	} else {
		log.Info("Broadcasting module update", "module", module.Module)
	}

	for conn := range ws.connections {
		if connection != nil {
			log.Info("WS: Broadcasting module update to connection", "connection", *connection, "module", module.Module)
			ws.SendMessage(conn, response)
		} else {
			log.Info("WS: Broadcasting module update to all listeners", "module", module.Module)
			for _, modules := range ws.dataListeners {
				for _, m := range modules {
					if m == module.Module {
						log.Info("WS: Broadcasting module update to listener", "listener", m, "module", module.Module)
						ws.SendMessage(conn, response)
					}
				}
			}
		}
	}
}

// handleGetDataModule handles module data updates from the event bus
func (ws *WebsocketServer) handleGetDataModule(event bus.Event) {
	log.Info("WS: event", "type", event.Type, "data", event.Data)
	if event.Type != bus.EventGetDataModule {
		return
	}

	log.Info("WS: EventGetDataModule", "eventData", event.Data)

	var moduleRequest bus.GetDataRequest
	if err := mapstructure.Decode(event.Data, &moduleRequest); err != nil {
		log.Error("Failed to decode module data", "error", err)
		return
	}

	log.Info("WS: EventGetDataModule", "data", moduleRequest)

	for _, moduleName := range moduleRequest.Modules {
		log.Info("WS: Broadcasting module update", "module", moduleName)

		modulePtr := ws.dataStore.GetModule(moduleName)
		if modulePtr.Data == nil {
			log.Warn("WS: No data found for module", "module", modulePtr)
			log.Warn("Sending empty module update")
		}

		// Convert data_module.Module to types.Module
		m := types.Module{
			Module: modulePtr.Module,
			Data:   modulePtr.Data,
		}

		ws.BroadcastModuleUpdate(m, &moduleRequest.Connection)
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
