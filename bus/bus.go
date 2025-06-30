package bus

import (
	"fmt"
	"runtime/debug"
	"sync"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

// EventType defines the type of events that can be published
type EventType string

const (
  // EventGetDataModule is the event type for getting data modules
	EventGetDataModule EventType = "GET_DATA_MODULE"
	// EventDataModuleUpdate is the event type for data module updates
	EventDataModuleUpdate EventType = "DATA_MODULE_UPDATE"
)

// Event represents an event in the system
type Event struct {
	Type   EventType
	Data   any
}

// GetDataRequest is the request for getting data modules
type GetDataRequest struct {
	Connection string             `json:"connection" mapstructure:"connection"`
	Modules    []types.ModuleName `json:"modules" mapstructure:"modules"`
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
	if eb == nil {
		log.Error("EventBus is nil")
		return
	}
	
	if handler == nil {
		log.Error("Handler is nil")
		return
	}
	
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
	if eb == nil {
		log.Error("EventBus is nil")
		return
	}
	
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
	if eb == nil {
		log.Error("EventBus is nil")
		return
	}
	
	eb.mutex.RLock()
	defer eb.mutex.RUnlock()

	if handlers, ok := eb.subscribers[event.Type]; ok {
		for id, handler := range handlers {
			if handler == nil {
				log.Warnf("Handler for subscriber '%s' is nil", id)
				continue
			}
			
			go func(id string, handler Handler) {
				defer func() {
					if r := recover(); r != nil {
						log.Errorf("Event handler panic recovered for subscriber '%s': %v", id, r)
						log.Errorf("Stack trace: %s", debug.Stack())
					}
				}()
				
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
