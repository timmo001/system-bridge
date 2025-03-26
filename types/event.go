package types

// MessageHandler represents a function that handles event messages
type MessageHandler func(message Message) MessageResponse

// MessageRouter represents the interface for routing event messages
type MessageRouter interface {
	RegisterHandler(event EventType, handler MessageHandler)
	RegisterSimpleHandler(event EventType, fn func(Message) MessageResponse)
	HandleMessage(message Message) MessageResponse
}

// Message represents an event message
type Message struct {
	ID    string    `json:"id" mapstructure:"id"`
	Event EventType `json:"event" mapstructure:"event"`
	Data  any       `json:"data" mapstructure:"data"`
}

// MessageResponse represents a response to an event message
type MessageResponse struct {
	ID      string          `json:"id" mapstructure:"id"`
	Type    ResponseType    `json:"type" mapstructure:"type"`
	Subtype ResponseSubtype `json:"subtype" mapstructure:"subtype"`
	Data    any            `json:"data" mapstructure:"data"`
	Message string         `json:"message,omitempty" mapstructure:"message,omitempty"`
	Module  string         `json:"module,omitempty" mapstructure:"module,omitempty"`
}

// EventType represents the type of event
type EventType string

// ResponseType represents the type of response
type ResponseType string

// ResponseSubtype represents the subtype of response
type ResponseSubtype string
