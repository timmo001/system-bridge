package event

// Message is the base type for all events
type Message struct {
	ID    string    `json:"id"`
	Event EventType `json:"event"`
	Data  any       `json:"data"`
}

type MessageResponse struct {
	ID      string          `json:"id"`
	Type    ResponseType    `json:"type"`
	Subtype ResponseSubtype `json:"subtype"`
	Data    any             `json:"data"`
	Message string          `json:"message,omitempty"`
	Module  string          `json:"module,omitempty"`
}

type MessageHandler func(message Message) MessageResponse

type MessageRouter struct {
	handlers map[EventType]MessageHandler
}

func NewMessageRouter() *MessageRouter {
	return &MessageRouter{
		handlers: make(map[EventType]MessageHandler),
	}
}

func (mr *MessageRouter) RegisterHandler(event EventType, handler MessageHandler) {
	mr.handlers[event] = handler
}

func (mr *MessageRouter) RegisterSimpleHandler(event EventType, fn func(Message) MessageResponse) {
	mr.RegisterHandler(event, MessageHandler(fn))
}

func (mr *MessageRouter) HandleMessage(message Message) MessageResponse {
	if handler, ok := mr.handlers[message.Event]; ok {
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
