package event

import (
	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

// Message is the base type for all events
type Message struct {
	ID    string    `json:"id" mapstructure:"id"`
	Event EventType `json:"event" mapstructure:"event"`
	Data  any       `json:"data" mapstructure:"data"`
}

// MessageResponse is the base type for all responses
type MessageResponse struct {
	ID      string           `json:"id" mapstructure:"id"`
	Type    ResponseType     `json:"type" mapstructure:"type"`
	Subtype ResponseSubtype  `json:"subtype" mapstructure:"subtype"`
	Data    any              `json:"data" mapstructure:"data"`
	Message string           `json:"message,omitempty" mapstructure:"message,omitempty"`
	Module  types.ModuleName `json:"module,omitempty" mapstructure:"module,omitempty"`
}

// MessageHandler is the type for all event handlers
type MessageHandler func(connection string, message Message) MessageResponse

// MessageRouter is the type for all event routers
type MessageRouter struct {
	Handlers map[EventType]MessageHandler
}

// NewMessageRouter creates a new MessageRouter
func NewMessageRouter() *MessageRouter {
	return &MessageRouter{
		Handlers: make(map[EventType]MessageHandler),
	}
}

// RegisterHandler registers a new event handler
func (mr *MessageRouter) RegisterHandler(event EventType, handler MessageHandler) {
	slog.Info("Registering event handler", "event", event)
	mr.Handlers[event] = handler
}

// RegisterSimpleHandler registers a new event handler
func (mr *MessageRouter) RegisterSimpleHandler(event EventType, fn func(string, Message) MessageResponse) {
	mr.RegisterHandler(event, MessageHandler(fn))
}

// HandleMessage handles a new event
func (mr *MessageRouter) HandleMessage(connection string, message Message) MessageResponse {
	if handler, ok := mr.Handlers[message.Event]; ok {
		return handler(connection, message)
	}

	slog.Warn("Method not found", "event", message.Event)

	return MessageResponse{
		ID:   message.ID,
		Type: ResponseTypeError,
		Data: map[string]Message{
			"message": message,
		},
		Message: "Method not found",
	}
}
