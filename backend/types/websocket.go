package types

// WebsocketConnection represents an interface for websocket operations
type WebsocketConnection interface {
	SendMessage(message interface{}) error
	Close() error
}

// WebsocketServer represents the interface for websocket server operations
type WebsocketServer interface {
	HandleConnection(connection WebsocketConnection)
	SendMessage(connection WebsocketConnection, message interface{}) error
}
