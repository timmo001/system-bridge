package websocket

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"sync"

	"log/slog"

	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

func (ws *WebsocketServer) HandleConnection(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("Failed to upgrade connection", "error", err)
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
			slog.Error("Error closing connection", "error", err)
		}
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Error("WebSocket error", "error", err)
			}
			break
		}

		var msg WebSocketRequest
		if err := json.Unmarshal(message, &msg); err != nil {
			slog.Error("Failed to parse message", "error", err)
			ws.SendError(conn, msg, "invalid_message", "Failed to parse message")
			continue
		}

		// Validate token
		if msg.Token != ws.token {
			slog.Error("Invalid token received")
			ws.SendError(conn, msg, "BAD_TOKEN", "Invalid token")
			continue
		}

		// Handle different event types
		slog.Info("Received message", "event", msg.Event, "id", msg.ID)
		// Pass message to event handlers
		response := ws.EventRouter.HandleMessage(conn.RemoteAddr().String(), event.Message{
			ID:    msg.ID,
			Event: event.EventType(msg.Event),
			Data:  msg.Data,
		})

		// Find the connectionInfo for this connection
		ws.mutex.RLock()
		addr := conn.RemoteAddr().String()
		connInfo, ok := ws.connections[addr]
		ws.mutex.RUnlock()

		if ok {
			ws.SendMessage(connInfo, response)
		} else {
			slog.Error("Connection not found in connections map during message handling", "addr", addr)
		}
	}
}

// AddConnection adds a new WebSocket connection
func (ws *WebsocketServer) AddConnection(conn *websocket.Conn) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	addr := conn.RemoteAddr().String()

	// close connection if remote addr tries to connect again
	if connInfo, ok := ws.connections[addr]; ok {
		// Remove the connection directly since we already hold the lock
		delete(ws.connections, addr)
		delete(ws.dataListeners, addr)
		_ = connInfo.conn.Close()
	}

	ws.connections[addr] = &connectionInfo{
		conn:     conn,
		writeMux: sync.Mutex{},
	}
}

// RemoveConnection removes a WebSocket connection
func (ws *WebsocketServer) RemoveConnection(conn *websocket.Conn) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()
	addr := conn.RemoteAddr().String()
	delete(ws.connections, addr)
	delete(ws.dataListeners, addr)
}

type RegisterResponse int

const (
	RegisterResponseAdded  RegisterResponse = 1
	RegisterResponseExists RegisterResponse = 2
)

// RegisterDataListener allows a client to receive module data updates
func (ws *WebsocketServer) RegisterDataListener(addr string, modules []types.ModuleName) RegisterResponse {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	if _, ok := ws.dataListeners[addr]; ok {
		return RegisterResponseExists
	}

	slog.Info(fmt.Sprintf("Registering data listener for %s", addr))
	ws.dataListeners[addr] = modules
	return RegisterResponseAdded
}

// UnregisterDataListener allows a client to stop receiving module data updates
func (ws *WebsocketServer) UnregisterDataListener(addr string) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	slog.Info(fmt.Sprintf("Unregistering data listener for %s", addr))
	delete(ws.dataListeners, addr)
}

// BroadcastModuleUpdate sends a module data update to all connected clients
func (ws *WebsocketServer) BroadcastModuleUpdate(module types.Module, addr *string) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	response := event.MessageResponse{
		ID:      "system",
		Type:    event.ResponseTypeDataUpdate,
		Subtype: event.ResponseSubtypeNone,
		Data:    module.Data,
		Module:  module.Name,
	}

	if module.Data == nil {
		slog.Warn("Broadcasting module update with no data", "module", module.Name, "data", module.Data)
	} else {
		slog.Info("Broadcasting module update", "module", module.Name)
	}

	if addr != nil {
		if connInfo, ok := ws.connections[*addr]; ok {
			slog.Debug("WS: Broadcasting module update to connection", "addr", *addr, "module", module.Name)
			ws.SendMessageWithLock(connInfo, response, true)
		} else {
			for remote_addr, connInfo := range ws.connections {
				modules, ok := ws.dataListeners[remote_addr]

				if ok && slices.Contains(modules, module.Name) {
					slog.Debug("WS: Broadcasting module update to listener", "addr", remote_addr, "module", module.Name)
					ws.SendMessageWithLock(connInfo, response, true)
				}

			}
		}
	}
}

// handleGetDataModule handles module data updates from the event bus
func (ws *WebsocketServer) handleGetDataModule(event bus.Event) {
	slog.Info("WS: event", "type", event.Type, "data", event.Data)
	if event.Type != bus.EventGetDataModule {
		return
	}

	slog.Info("WS: EventGetDataModule", "eventData", event.Data)

	var moduleRequest bus.GetDataRequest
	if err := mapstructure.Decode(event.Data, &moduleRequest); err != nil {
		slog.Error("Failed to decode module data", "error", err)
		return
	}

	slog.Info("WS: EventGetDataModule", "data", moduleRequest)

	for _, moduleName := range moduleRequest.Modules {
		slog.Info("WS: Broadcasting module update", "module", moduleName)

		module, err := ws.dataStore.GetModule(moduleName)
		if err != nil {
			slog.Warn("Data module not registered", "module", moduleName)
			continue
		}

		if module.Data == nil {
			slog.Warn("WS: No data found for module", "module", moduleName)
			slog.Warn("Sending empty module update")
		}

		ws.BroadcastModuleUpdate(module, &moduleRequest.Connection)
	}
}

// handleDataModuleUpdate handles module data updates from the event bus
func (ws *WebsocketServer) handleDataModuleUpdate(event bus.Event) {
	slog.Info("WS: event", "type", event.Type)
	if event.Type != bus.EventDataModuleUpdate {
		return
	}

	var module types.Module
	if err := mapstructure.Decode(event.Data, &module); err != nil {
		slog.Error("Failed to decode module data", "error", err)
		return
	}

	slog.Info("Received module data update from event bus", "module", module.Name)

	// Broadcast to connected websocket clients
	ws.BroadcastModuleUpdate(module, nil)
}
