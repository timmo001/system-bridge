package event

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/settings"
)

// Message is the base type for all events
type Message struct {
	ID    string    `json:"id" mapstructure:"id"`
	Event EventType `json:"event" mapstructure:"event"`
	Data  any       `json:"data" mapstructure:"data"`
}

type MessageResponse struct {
	ID      string          `json:"id" mapstructure:"id"`
	Type    ResponseType    `json:"type" mapstructure:"type"`
	Subtype ResponseSubtype `json:"subtype" mapstructure:"subtype"`
	Data    any             `json:"data" mapstructure:"data"`
	Message string          `json:"message,omitempty" mapstructure:"message,omitempty"`
	Module  string          `json:"module,omitempty" mapstructure:"module,omitempty"`
}

type MessageHandler func(message Message) MessageResponse

type MessageRouter struct {
	Settings *settings.Settings
	DataStore *data.DataStore
	Handlers map[EventType]MessageHandler
}

func NewMessageRouter(settings *settings.Settings, dataStore *data.DataStore) *MessageRouter {
	return &MessageRouter{
		Settings: settings,
		DataStore: dataStore,
		Handlers: make(map[EventType]MessageHandler),
	}
}

func (mr *MessageRouter) RegisterHandler(event EventType, handler MessageHandler) {
	log.Info("Registering event handler", "event", event)
	mr.Handlers[event] = handler
}

func (mr *MessageRouter) RegisterSimpleHandler(event EventType, fn func(Message) MessageResponse) {
	mr.RegisterHandler(event, MessageHandler(fn))
}

func (mr *MessageRouter) HandleMessage(message Message) MessageResponse {
	if handler, ok := mr.Handlers[message.Event]; ok {
		return handler(message)
	}

	return MessageResponse{
		ID:   message.ID,
		Type: ResponseTypeError,
		Data: map[string]Message{
			"message": message,
		},
		Message: "Method not found",
	}
}
