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
			slog.Debug("Sending WebSocket response", "type", response.Type, "id", response.ID, "message", response.Message)
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
	slog.Info("WS: Adding new connection", "addr", addr)

	// close connection if remote addr tries to connect again
	if connInfo, ok := ws.connections[addr]; ok {
		slog.Info("WS: Replacing existing connection", "addr", addr)
		// Remove the connection directly since we already hold the lock
		delete(ws.connections, addr)
		delete(ws.dataListeners, addr)
		_ = connInfo.conn.Close()
	}

	ws.connections[addr] = &connectionInfo{
		conn:     conn,
		writeMux: sync.Mutex{},
	}

	slog.Info("WS: Connection added successfully", "addr", addr, "total_connections", len(ws.connections))
}

// RemoveConnection removes a WebSocket connection
func (ws *WebsocketServer) RemoveConnection(conn *websocket.Conn) {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()
	addr := conn.RemoteAddr().String()
	slog.Info("WS: Removing connection", "addr", addr)
	delete(ws.connections, addr)
	delete(ws.dataListeners, addr)
	slog.Info("WS: Connection removed", "addr", addr, "total_connections", len(ws.connections))
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
		slog.Info("WS: Data listener already exists", "addr", addr, "modules", modules)
		return RegisterResponseExists
	}

	slog.Info("WS: Registering data listener", "addr", addr, "modules", modules)
	ws.dataListeners[addr] = modules
	slog.Info("WS: Data listener registered successfully", "addr", addr, "total_listeners", len(ws.dataListeners))
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

	// Debug logging for connections and listeners
	slog.Debug("WS: Current connections", "count", len(ws.connections))
	slog.Debug("WS: Current data listeners", "count", len(ws.dataListeners))
	for remote_addr, modules := range ws.dataListeners {
		slog.Debug("WS: Data listener", "addr", remote_addr, "modules", modules)
	}

	if addr != nil {
		// Send to specific connection
		if connInfo, ok := ws.connections[*addr]; ok {
			slog.Debug("WS: Broadcasting module update to connection", "addr", *addr, "module", module.Name)
			ws.SendMessageWithLock(connInfo, response, true)
		} else {
			slog.Warn("WS: Connection not found for specific address", "addr", *addr)
		}
	} else {
		// Broadcast to all connections that are listening for this module
		broadcastCount := 0
		for remote_addr, connInfo := range ws.connections {
			modules, ok := ws.dataListeners[remote_addr]

			if ok && slices.Contains(modules, module.Name) {
				slog.Info("WS: Broadcasting module update to listener", "addr", remote_addr, "module", module.Name)
				ws.SendMessageWithLock(connInfo, response, true)
				broadcastCount++
			}
		}
		slog.Info("WS: Broadcast complete", "module", module.Name, "recipients", broadcastCount)
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
