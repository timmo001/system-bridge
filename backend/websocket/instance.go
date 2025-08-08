package websocket

import (
	"sync"
)

var (
	globalInstance *WebsocketServer
	instanceMutex  sync.RWMutex
)

// GetInstance returns the global WebSocket server instance
func GetInstance() *WebsocketServer {
	instanceMutex.RLock()
	defer instanceMutex.RUnlock()
	return globalInstance
}

// SetInstance sets the global WebSocket server instance
func SetInstance(instance *WebsocketServer) {
	instanceMutex.Lock()
	defer instanceMutex.Unlock()
	globalInstance = instance
}
