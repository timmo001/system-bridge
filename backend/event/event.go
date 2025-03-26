package event

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

type MessageRouter struct {
	Settings  *settings.Settings
	DataStore *data.DataStore
	Handlers  map[types.EventType]types.MessageHandler
}

// Ensure MessageRouter implements types.MessageRouter
var _ types.MessageRouter = (*MessageRouter)(nil)

func NewMessageRouter(s types.Server) *MessageRouter {
	return &MessageRouter{
		Settings:  s.GetSettings(),
		DataStore: s.GetDataStore(),
		Handlers:  make(map[types.EventType]types.MessageHandler),
	}
}

func (mr *MessageRouter) RegisterHandler(event types.EventType, handler types.MessageHandler) {
	log.Info("Registering event handler", "event", event)
	mr.Handlers[event] = handler
}

func (mr *MessageRouter) RegisterSimpleHandler(event types.EventType, fn func(types.Message) types.MessageResponse) {
	mr.RegisterHandler(event, types.MessageHandler(fn))
}

func (mr *MessageRouter) HandleMessage(message types.Message) types.MessageResponse {
	if handler, ok := mr.Handlers[message.Event]; ok {
		return handler(message)
	}

	return types.MessageResponse{
		ID:   message.ID,
		Type: types.ResponseType("error"),
		Data: map[string]types.Message{
			"message": message,
		},
		Message: "Method not found",
	}
}
