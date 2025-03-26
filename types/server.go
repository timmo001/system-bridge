package types

import (
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/settings"
)

// Server represents the interface for the server functionality
type Server interface {
	GetSettings() *settings.Settings
	GetDataStore() *data.DataStore
	GetEventMessageRouter() MessageRouter
}
