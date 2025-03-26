package event

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/settings"
	types_event "github.com/timmo001/system-bridge/shared/types/event"
)

type MessageHandler func(message types_event.Message) types_event.MessageResponse

type MessageRouter struct {
	Settings  *settings.Settings
	DataStore *data.DataStore
	Handlers  map[types_event.EventType]MessageHandler
}

func NewMessageRouter(settings *settings.Settings, dataStore *data.DataStore) *MessageRouter {
	return &MessageRouter{
		Settings:  settings,
		DataStore: dataStore,
		Handlers:  make(map[types_event.EventType]MessageHandler),
	}
}

func (mr *MessageRouter) RegisterHandler(event types_event.EventType, handler MessageHandler) {
	log.Info("Registering event handler", "event", event)
	mr.Handlers[event] = handler
}

func (mr *MessageRouter) RegisterSimpleHandler(event types_event.EventType, fn func(types_event.Message) types_event.MessageResponse) {
	mr.RegisterHandler(event, MessageHandler(fn))
}

func (mr *MessageRouter) HandleMessage(message types_event.Message) types_event.MessageResponse {
	if handler, ok := mr.Handlers[message.Event]; ok {
		return handler(message)
	}

	return types_event.MessageResponse{
		ID:   message.ID,
		Type: types_event.ResponseTypeError,
		Data: map[string]types_event.Message{
			"message": message,
		},
		Message: "Method not found",
	}
}
