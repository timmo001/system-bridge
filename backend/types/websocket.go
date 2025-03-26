package types

import "net/http"

// WebsocketConnection represents an interface for websocket operations
type WebsocketConnection interface {
	SendMessage(message interface{}) error
	Close() error
}

// WebsocketServer represents the interface for websocket server operations
type WebsocketServer interface {
	HandleConnection(w http.ResponseWriter, r *http.Request) (WebsocketConnection, error)
	SendMessage(connection WebsocketConnection, message interface{}) error
}
