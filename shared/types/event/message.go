package event

// Message is the base type for all events
type Message struct {
	ID    string    `json:"id" mapstructure:"id"`
	Event EventType `json:"event" mapstructure:"event"`
	Data  any       `json:"data" mapstructure:"data"`
}

// MessageResponse is the base type for all responses
type MessageResponse struct {
	ID      string          `json:"id" mapstructure:"id"`
	Type    ResponseType    `json:"type" mapstructure:"type"`
	Subtype ResponseSubtype `json:"subtype" mapstructure:"subtype"`
	Data    any             `json:"data" mapstructure:"data"`
	Message string          `json:"message,omitempty" mapstructure:"message,omitempty"`
	Module  string          `json:"module,omitempty" mapstructure:"module,omitempty"`
}
