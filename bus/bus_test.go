package bus

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
)

func TestNewEventBus(t *testing.T) {
	t.Run("Create new event bus", func(t *testing.T) {
		eb := NewEventBus()

		assert.NotNil(t, eb)
		assert.NotNil(t, eb.subscribers)
		assert.Len(t, eb.subscribers, 0)
	})
}

func TestEventBus_Subscribe(t *testing.T) {
	t.Run("Subscribe to event type", func(t *testing.T) {
		eb := NewEventBus()

		handler := func(event Event) {
			// Test handler - just receive the event
		}

		eb.Subscribe(EventGetDataModule, "test-subscriber", handler)

		assert.Len(t, eb.subscribers, 1)
		assert.Contains(t, eb.subscribers, EventGetDataModule)
		assert.Len(t, eb.subscribers[EventGetDataModule], 1)
		assert.Contains(t, eb.subscribers[EventGetDataModule], "test-subscriber")
	})

	t.Run("Subscribe multiple handlers to same event", func(t *testing.T) {
		eb := NewEventBus()

		handler1 := func(event Event) {}
		handler2 := func(event Event) {}

		eb.Subscribe(EventGetDataModule, "subscriber-1", handler1)
		eb.Subscribe(EventGetDataModule, "subscriber-2", handler2)

		assert.Len(t, eb.subscribers, 1)
		assert.Len(t, eb.subscribers[EventGetDataModule], 2)
		assert.Contains(t, eb.subscribers[EventGetDataModule], "subscriber-1")
		assert.Contains(t, eb.subscribers[EventGetDataModule], "subscriber-2")
	})

	t.Run("Subscribe to multiple event types", func(t *testing.T) {
		eb := NewEventBus()

		handler := func(event Event) {}

		eb.Subscribe(EventGetDataModule, "subscriber", handler)
		eb.Subscribe(EventDataModuleUpdate, "subscriber", handler)

		assert.Len(t, eb.subscribers, 2)
		assert.Contains(t, eb.subscribers, EventGetDataModule)
		assert.Contains(t, eb.subscribers, EventDataModuleUpdate)
	})

	t.Run("Replace existing subscriber", func(t *testing.T) {
		eb := NewEventBus()

		handler1 := func(event Event) {}
		handler2 := func(event Event) {}

		eb.Subscribe(EventGetDataModule, "subscriber", handler1)
		assert.Len(t, eb.subscribers[EventGetDataModule], 1)

		eb.Subscribe(EventGetDataModule, "subscriber", handler2)
		assert.Len(t, eb.subscribers[EventGetDataModule], 1)
	})
}

func TestEventBus_Unsubscribe(t *testing.T) {
	t.Run("Unsubscribe existing subscriber", func(t *testing.T) {
		eb := NewEventBus()

		handler := func(event Event) {}
		eb.Subscribe(EventGetDataModule, "test-subscriber", handler)

		assert.Len(t, eb.subscribers[EventGetDataModule], 1)

		eb.Unsubscribe(EventGetDataModule, "test-subscriber")

		assert.Len(t, eb.subscribers, 0) // Should clean up empty event type
	})

	t.Run("Unsubscribe one of multiple subscribers", func(t *testing.T) {
		eb := NewEventBus()

		handler1 := func(event Event) {}
		handler2 := func(event Event) {}

		eb.Subscribe(EventGetDataModule, "subscriber-1", handler1)
		eb.Subscribe(EventGetDataModule, "subscriber-2", handler2)

		assert.Len(t, eb.subscribers[EventGetDataModule], 2)

		eb.Unsubscribe(EventGetDataModule, "subscriber-1")

		assert.Len(t, eb.subscribers, 1)
		assert.Len(t, eb.subscribers[EventGetDataModule], 1)
		assert.Contains(t, eb.subscribers[EventGetDataModule], "subscriber-2")
		assert.NotContains(t, eb.subscribers[EventGetDataModule], "subscriber-1")
	})

	t.Run("Unsubscribe non-existent subscriber", func(t *testing.T) {
		eb := NewEventBus()

		// Should not panic or cause issues
		eb.Unsubscribe(EventGetDataModule, "non-existent")
		assert.Len(t, eb.subscribers, 0)
	})

	t.Run("Unsubscribe from non-existent event type", func(t *testing.T) {
		eb := NewEventBus()

		// Should not panic or cause issues
		eb.Unsubscribe(EventGetDataModule, "subscriber")
		assert.Len(t, eb.subscribers, 0)
	})
}

func TestEventBus_Publish(t *testing.T) {
	t.Run("Publish event to single subscriber", func(t *testing.T) {
		eb := NewEventBus()

		var receivedEvent Event
		var wg sync.WaitGroup
		wg.Add(1)

		handler := func(event Event) {
			receivedEvent = event
			wg.Done()
		}

		eb.Subscribe(EventGetDataModule, "test-subscriber", handler)

		testEvent := Event{
			Type: EventGetDataModule,
			Data: "test data",
		}

		eb.Publish(testEvent)

		// Wait for handler to be called (with timeout)
		done := make(chan struct{})
		go func() {
			wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			assert.Equal(t, testEvent.Type, receivedEvent.Type)
			assert.Equal(t, testEvent.Data, receivedEvent.Data)
		case <-time.After(time.Second):
			t.Fatal("Handler was not called within timeout")
		}
	})

	t.Run("Publish event to multiple subscribers", func(t *testing.T) {
		eb := NewEventBus()

		var receivedEvents []Event
		var mu sync.Mutex
		var wg sync.WaitGroup
		wg.Add(3)

		createHandler := func(id string) Handler {
			return func(event Event) {
				mu.Lock()
				receivedEvents = append(receivedEvents, event)
				mu.Unlock()
				wg.Done()
			}
		}

		eb.Subscribe(EventGetDataModule, "subscriber-1", createHandler("1"))
		eb.Subscribe(EventGetDataModule, "subscriber-2", createHandler("2"))
		eb.Subscribe(EventGetDataModule, "subscriber-3", createHandler("3"))

		testEvent := Event{
			Type: EventGetDataModule,
			Data: "broadcast data",
		}

		eb.Publish(testEvent)

		// Wait for all handlers to be called (with timeout)
		done := make(chan struct{})
		go func() {
			wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			mu.Lock()
			assert.Len(t, receivedEvents, 3)
			for _, event := range receivedEvents {
				assert.Equal(t, testEvent.Type, event.Type)
				assert.Equal(t, testEvent.Data, event.Data)
			}
			mu.Unlock()
		case <-time.After(time.Second):
			t.Fatal("Not all handlers were called within timeout")
		}
	})

	t.Run("Publish event with no subscribers", func(t *testing.T) {
		eb := NewEventBus()

		testEvent := Event{
			Type: EventGetDataModule,
			Data: "no subscribers",
		}

		// Should not panic or cause issues
		eb.Publish(testEvent)
	})

	t.Run("Publish different event types", func(t *testing.T) {
		eb := NewEventBus()

		var receivedEvent1, receivedEvent2 Event
		var wg sync.WaitGroup
		wg.Add(2)

		eb.Subscribe(EventGetDataModule, "subscriber-1", func(event Event) {
			receivedEvent1 = event
			wg.Done()
		})

		eb.Subscribe(EventDataModuleUpdate, "subscriber-2", func(event Event) {
			receivedEvent2 = event
			wg.Done()
		})

		// Publish to first event type
		event1 := Event{Type: EventGetDataModule, Data: "data1"}
		eb.Publish(event1)

		// Publish to second event type
		event2 := Event{Type: EventDataModuleUpdate, Data: "data2"}
		eb.Publish(event2)

		// Wait for handlers
		done := make(chan struct{})
		go func() {
			wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			assert.Equal(t, event1, receivedEvent1)
			assert.Equal(t, event2, receivedEvent2)
		case <-time.After(time.Second):
			t.Fatal("Handlers were not called within timeout")
		}
	})
}

func TestEventBus_ConcurrentOperations(t *testing.T) {
	t.Run("Concurrent subscribe and publish", func(t *testing.T) {
		eb := NewEventBus()

		numSubscribers := 10
		numEvents := 5

		var wg sync.WaitGroup
		var receivedCount int32
		var mu sync.Mutex

		// Start subscribers
		for i := 0; i < numSubscribers; i++ {
			wg.Add(1)
			go func(id int) {
				defer wg.Done()

				handler := func(event Event) {
					mu.Lock()
					receivedCount++
					mu.Unlock()
				}

				eb.Subscribe(EventGetDataModule, "subscriber-"+string(rune(id+'0')), handler)
			}(i)
		}

		// Wait for all subscribers to register
		wg.Wait()

		// Reset wait group for events
		wg.Add(numSubscribers * numEvents)

		// Update handler to use wait group
		for i := 0; i < numSubscribers; i++ {
			handler := func(event Event) {
				mu.Lock()
				receivedCount++
				mu.Unlock()
				wg.Done()
			}
			eb.Subscribe(EventGetDataModule, "subscriber-"+string(rune(i+'0')), handler)
		}

		// Publish events concurrently
		for i := 0; i < numEvents; i++ {
			go func(eventNum int) {
				event := Event{
					Type: EventGetDataModule,
					Data: "event-" + string(rune(eventNum+'0')),
				}
				eb.Publish(event)
			}(i)
		}

		// Wait for all events to be processed
		done := make(chan struct{})
		go func() {
			wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			mu.Lock()
			expectedCount := int32(numSubscribers * numEvents)
			assert.Equal(t, expectedCount, receivedCount)
			mu.Unlock()
		case <-time.After(5 * time.Second):
			t.Fatal("Not all events were processed within timeout")
		}
	})
}

func TestGetInstance(t *testing.T) {
	t.Run("Get singleton instance", func(t *testing.T) {
		instance1 := GetInstance()
		instance2 := GetInstance()

		assert.NotNil(t, instance1)
		assert.NotNil(t, instance2)
		assert.Same(t, instance1, instance2) // Should be the same instance
	})

	t.Run("Singleton instance is functional", func(t *testing.T) {
		eb := GetInstance()

		var receivedEvent Event
		var wg sync.WaitGroup
		wg.Add(1)

		handler := func(event Event) {
			receivedEvent = event
			wg.Done()
		}

		eb.Subscribe(EventGetDataModule, "singleton-test", handler)

		testEvent := Event{
			Type: EventGetDataModule,
			Data: "singleton test data",
		}

		eb.Publish(testEvent)

		done := make(chan struct{})
		go func() {
			wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			assert.Equal(t, testEvent, receivedEvent)
		case <-time.After(time.Second):
			t.Fatal("Handler was not called within timeout")
		}
	})
}

func TestEventStructs(t *testing.T) {
	t.Run("Event struct", func(t *testing.T) {
		event := Event{
			Type: EventDataModuleUpdate,
			Data: map[string]interface{}{
				"module": "cpu",
				"data":   map[string]float64{"usage": 45.5},
			},
		}

		assert.Equal(t, EventDataModuleUpdate, event.Type)

		data, ok := event.Data.(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "cpu", data["module"])
	})

	t.Run("GetDataRequest struct", func(t *testing.T) {
		request := GetDataRequest{
			Connection: "websocket-123",
			Modules:    []types.ModuleName{types.ModuleCPU, types.ModuleMemory},
		}

		assert.Equal(t, "websocket-123", request.Connection)
		assert.Len(t, request.Modules, 2)
		assert.Contains(t, request.Modules, types.ModuleCPU)
		assert.Contains(t, request.Modules, types.ModuleMemory)
	})
}

func TestEventTypes(t *testing.T) {
	t.Run("Event type constants", func(t *testing.T) {
		assert.Equal(t, EventType("GET_DATA_MODULE"), EventGetDataModule)
		assert.Equal(t, EventType("DATA_MODULE_UPDATE"), EventDataModuleUpdate)
	})
}
