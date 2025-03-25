package event

// EventType represents the type of event being handled
type EventType string

const (
	// EventExit is sent when the backend should exit
	EventExit EventType = "EXIT_BACKEND"
)
