package types

// PowerState is what the host is about to do, or has just done
type PowerState string

const (
	PowerStateSleeping     PowerState = "sleeping"      // Sleep or hibernate
	PowerStateShuttingDown PowerState = "shutting_down" // Power off or restart
	PowerStateResumed      PowerState = "resumed"
)

// PowerStateEvent is broadcast to every client before the host sleeps or
// shuts down, and after it wakes
type PowerStateEvent struct {
	State PowerState `json:"state" mapstructure:"state"`
}
