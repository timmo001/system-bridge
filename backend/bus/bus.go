package bus

import (
	"fmt"
	"sync"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

// EventType defines the type of events that can be published
type EventType string

const (
	// EventDataModuleUpdate is the event type for data module updates
	EventDataModuleUpdate EventType = "DATA_MODULE_UPDATE"
)

// Event represents an event in the system
type Event struct {
	Type   EventType
	Module types.ModuleName
	Data   any
}

// Handler is a function that handles events
type Handler func(event Event)

// EventBus is a central message broker for the application
type EventBus struct {
	subscribers map[EventType]map[string]Handler
	mutex       sync.RWMutex
}

// NewEventBus creates a new instance of the event bus
func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[EventType]map[string]Handler),
	}
}

// Subscribe registers a handler for a specific event type
func (eb *EventBus) Subscribe(eventType EventType, subscriberID string, handler Handler) {
	eb.mutex.Lock()
	defer eb.mutex.Unlock()

	if _, ok := eb.subscribers[eventType]; !ok {
		eb.subscribers[eventType] = make(map[string]Handler)
	}

	eb.subscribers[eventType][subscriberID] = handler
	log.Info(fmt.Sprintf("Subscriber '%s' registered for event type '%s'", subscriberID, eventType))
}

// Unsubscribe removes a handler for a specific event type
func (eb *EventBus) Unsubscribe(eventType EventType, subscriberID string) {
	eb.mutex.Lock()
	defer eb.mutex.Unlock()

	if _, ok := eb.subscribers[eventType]; !ok {
		return
	}

	if _, ok := eb.subscribers[eventType][subscriberID]; ok {
		delete(eb.subscribers[eventType], subscriberID)
		log.Info(fmt.Sprintf("Subscriber '%s' unregistered from event type '%s'", subscriberID, eventType))
	}

	// If no subscribers left for this event type, clean up
	if len(eb.subscribers[eventType]) == 0 {
		delete(eb.subscribers, eventType)
	}
}

// Publish sends an event to all subscribers of the given event type
func (eb *EventBus) Publish(event Event) {
	eb.mutex.RLock()
	defer eb.mutex.RUnlock()

	if handlers, ok := eb.subscribers[event.Type]; ok {
		for id, handler := range handlers {
			go func(id string, handler Handler) {
				log.Debug(fmt.Sprintf("Delivering event type '%s' to subscriber '%s'", event.Type, id))
				handler(event)
			}(id, handler)
		}
	}
}

// GetInstance returns the singleton instance of the event bus
var instance *EventBus
var once sync.Once

func GetInstance() *EventBus {
	once.Do(func() {
		instance = NewEventBus()
	})
	return instance
}
