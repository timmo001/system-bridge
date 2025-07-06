package websocket

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime/debug"
	"slices"
	"sync"

	"github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

func (ws *WebsocketServer) HandleConnection(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	if ws == nil {
		log.Error("WebsocketServer is nil")
		return nil, fmt.Errorf("websocket server is not initialized")
	}
	
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
		if r := recover(); r != nil {
			log.Errorf("WebSocket message handler panic recovered: %v", r)
			log.Errorf("Stack trace: %s", debug.Stack())
		}
		ws.RemoveConnection(conn)
		if err := conn.Close(); err != nil {
			log.Error("Error closing connection:", err)
		}
	}()

	if ws == nil || conn == nil {
		log.Error("WebsocketServer or connection is nil")
		return
	}

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
			ws.SendError(conn, msg, "BAD_TOKEN", "Invalid token")
			continue
		}

		// Handle different event types
		log.Info("Received message", "event", msg.Event, "id", msg.ID)
		
		// Safely handle message processing
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Errorf("Message processing panic recovered: %v", r)
					log.Errorf("Stack trace: %s", debug.Stack())
					ws.SendError(conn, msg, "internal_error", "Internal server error")
				}
			}()
			
			if ws.EventRouter == nil {
				log.Error("EventRouter is nil")
				ws.SendError(conn, msg, "internal_error", "Event router unavailable")
				return
			}
			
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
				log.Error("Connection not found in connections map during message handling", "addr", addr)
			}
		}()
	}
}

// AddConnection adds a new WebSocket connection
func (ws *WebsocketServer) AddConnection(conn *websocket.Conn) {
	if ws == nil || conn == nil {
		log.Error("WebsocketServer or connection is nil")
		return
	}
	
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	addr := conn.RemoteAddr().String()

	// close connection if remote addr tries to connect again
	if connInfo, ok := ws.connections[addr]; ok {
		// Remove the connection directly since we already hold the lock
		delete(ws.connections, addr)
		delete(ws.dataListeners, addr)
		if connInfo != nil && connInfo.conn != nil {
			_ = connInfo.conn.Close()
		}
	}

	ws.connections[addr] = &connectionInfo{
		conn:     conn,
		writeMux: sync.Mutex{},
	}
}

// RemoveConnection removes a WebSocket connection
func (ws *WebsocketServer) RemoveConnection(conn *websocket.Conn) {
	if ws == nil || conn == nil {
		log.Error("WebsocketServer or connection is nil")
		return
	}
	
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
	if ws == nil {
		log.Error("WebsocketServer is nil")
		return RegisterResponseExists
	}
	
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	if _, ok := ws.dataListeners[addr]; ok {
		return RegisterResponseExists
	}

	log.Infof("Registering data listener for %s", addr)
	ws.dataListeners[addr] = modules
	return RegisterResponseAdded
}

// UnregisterDataListener allows a client to stop receiving module data updates
func (ws *WebsocketServer) UnregisterDataListener(addr string) {
	if ws == nil {
		log.Error("WebsocketServer is nil")
		return
	}
	
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	log.Infof("Unregistering data listener for %s", addr)
	delete(ws.dataListeners, addr)
}

// BroadcastModuleUpdate sends a module data update to all connected clients
func (ws *WebsocketServer) BroadcastModuleUpdate(module types.Module, addr *string) {
	defer func() {
		if r := recover(); r != nil {
			log.Errorf("BroadcastModuleUpdate panic recovered: %v", r)
			log.Errorf("Stack trace: %s", debug.Stack())
		}
	}()
	
	if ws == nil {
		log.Error("WebsocketServer is nil")
		return
	}
	
	ws.mutex.RLock()
	defer ws.mutex.RUnlock()

	response := event.MessageResponse{
		ID:      "system",
		Type:    event.ResponseTypeDataUpdate,
		Subtype: event.ResponseSubtypeNone,
		Data:    module.Data,
		Module:  module.Name,
	}

	if module.Data == nil {
		log.Warn("Broadcasting module update with no data", "module", module.Name, "data", module.Data)
	} else {
		log.Info("Broadcasting module update", "module", module.Name)
	}

	if addr != nil {
		if connInfo, ok := ws.connections[*addr]; ok && connInfo != nil {
			log.Debug("WS: Broadcasting module update to connection", "addr", *addr, "module", module.Name)
			ws.SendMessage(connInfo, response)
		} else {
			for remote_addr, connInfo := range ws.connections {
				if connInfo == nil {
					continue
				}
				
				modules, ok := ws.dataListeners[remote_addr]

				if ok && slices.Contains(modules, module.Name) {
					log.Debug("WS: Broadcasting module update to listener", "addr", remote_addr, "module", module.Name)
					ws.SendMessage(connInfo, response)
				}

			}
		}
	}
}

// handleGetDataModule handles module data updates from the event bus
func (ws *WebsocketServer) handleGetDataModule(event bus.Event) {
	defer func() {
		if r := recover(); r != nil {
			log.Errorf("handleGetDataModule panic recovered: %v", r)
			log.Errorf("Stack trace: %s", debug.Stack())
		}
	}()
	
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

	if ws.dataStore == nil {
		log.Error("Data store is nil")
		return
	}

	for _, moduleName := range moduleRequest.Modules {
		log.Info("WS: Broadcasting module update", "module", moduleName)

		module, err := ws.dataStore.GetModule(moduleName)
		if err != nil {
			log.Warn("Data module not registered", "module", moduleName)
			continue
		}

		if module.Data == nil {
			log.Warn("WS: No data found for module", "module", moduleName)
			log.Warn("Sending empty module update")
		}

		ws.BroadcastModuleUpdate(module, &moduleRequest.Connection)
	}
}

// handleDataModuleUpdate handles module data updates from the event bus
func (ws *WebsocketServer) handleDataModuleUpdate(event bus.Event) {
	defer func() {
		if r := recover(); r != nil {
			log.Errorf("handleDataModuleUpdate panic recovered: %v", r)
			log.Errorf("Stack trace: %s", debug.Stack())
		}
	}()
	
	log.Info("WS: event", "type", event.Type)
	if event.Type != bus.EventDataModuleUpdate {
		return
	}

	var module types.Module
	if err := mapstructure.Decode(event.Data, &module); err != nil {
		log.Error("Failed to decode module data", "error", err)
		return
	}

	log.Info("Received module data update from event bus", "module", module.Name)

	// Broadcast to connected websocket clients
	ws.BroadcastModuleUpdate(module, nil)
}
