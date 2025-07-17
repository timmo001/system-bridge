package event

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
)

func TestMessage(t *testing.T) {
	t.Run("Create message struct", func(t *testing.T) {
		msg := Message{
			ID:    "test-id-123",
			Event: EventGetData,
			Data:  map[string]string{"key": "value"},
		}

		assert.Equal(t, "test-id-123", msg.ID)
		assert.Equal(t, EventGetData, msg.Event)
		assert.Equal(t, map[string]string{"key": "value"}, msg.Data)
	})
}

func TestMessageResponse(t *testing.T) {
	t.Run("Create message response struct", func(t *testing.T) {
		response := MessageResponse{
			ID:      "response-id-456",
			Type:    ResponseTypeDataGet,
			Subtype: ResponseSubtypeNone,
			Data:    map[string]interface{}{"result": "success"},
			Message: "Operation completed successfully",
			Module:  types.ModuleCPU,
		}

		assert.Equal(t, "response-id-456", response.ID)
		assert.Equal(t, ResponseTypeDataGet, response.Type)
		assert.Equal(t, ResponseSubtypeNone, response.Subtype)
		assert.Equal(t, map[string]interface{}{"result": "success"}, response.Data)
		assert.Equal(t, "Operation completed successfully", response.Message)
		assert.Equal(t, types.ModuleCPU, response.Module)
	})

	t.Run("Create error response", func(t *testing.T) {
		response := MessageResponse{
			ID:      "error-id-789",
			Type:    ResponseTypeError,
			Data:    map[string]string{"error": "not found"},
			Message: "Module not found",
		}

		assert.Equal(t, "error-id-789", response.ID)
		assert.Equal(t, ResponseTypeError, response.Type)
		assert.Equal(t, "Module not found", response.Message)
	})
}

func TestNewMessageRouter(t *testing.T) {
	t.Run("Create new message router", func(t *testing.T) {
		router := NewMessageRouter()

		assert.NotNil(t, router)
		assert.NotNil(t, router.Handlers)
		assert.Len(t, router.Handlers, 0)
	})
}

func TestMessageRouter_RegisterHandler(t *testing.T) {
	t.Run("Register handler successfully", func(t *testing.T) {
		router := NewMessageRouter()

		testHandler := func(connection string, message Message) MessageResponse {
			return MessageResponse{
				ID:   message.ID,
				Type: ResponseTypeDataGet,
				Data: "test response",
			}
		}

		router.RegisterHandler(EventGetData, testHandler)

		assert.Len(t, router.Handlers, 1)
		assert.Contains(t, router.Handlers, EventGetData)
	})

	t.Run("Register multiple handlers", func(t *testing.T) {
		router := NewMessageRouter()

		handler1 := func(connection string, message Message) MessageResponse {
			return MessageResponse{ID: message.ID, Type: ResponseTypeDataGet}
		}

		handler2 := func(connection string, message Message) MessageResponse {
			return MessageResponse{ID: message.ID, Type: ResponseTypeSettingsResult}
		}

		router.RegisterHandler(EventGetData, handler1)
		router.RegisterHandler(EventGetSettings, handler2)

		assert.Len(t, router.Handlers, 2)
		assert.Contains(t, router.Handlers, EventGetData)
		assert.Contains(t, router.Handlers, EventGetSettings)
	})

	t.Run("Replace existing handler", func(t *testing.T) {
		router := NewMessageRouter()

		originalHandler := func(connection string, message Message) MessageResponse {
			return MessageResponse{ID: message.ID, Type: ResponseTypeDataGet, Data: "original"}
		}

		newHandler := func(connection string, message Message) MessageResponse {
			return MessageResponse{ID: message.ID, Type: ResponseTypeDataGet, Data: "new"}
		}

		// Register original handler
		router.RegisterHandler(EventGetData, originalHandler)
		assert.Len(t, router.Handlers, 1)

		// Replace with new handler
		router.RegisterHandler(EventGetData, newHandler)
		assert.Len(t, router.Handlers, 1)

		// Test that new handler is used
		msg := Message{ID: "test", Event: EventGetData}
		response := router.HandleMessage("test-conn", msg)
		assert.Equal(t, "new", response.Data)
	})
}

func TestMessageRouter_RegisterSimpleHandler(t *testing.T) {
	t.Run("Register simple handler", func(t *testing.T) {
		router := NewMessageRouter()

		simpleHandler := func(connection string, message Message) MessageResponse {
			return MessageResponse{
				ID:   message.ID,
				Type: ResponseTypeDataGet,
				Data: "simple handler response",
			}
		}

		router.RegisterSimpleHandler(EventGetData, simpleHandler)

		assert.Len(t, router.Handlers, 1)
		assert.Contains(t, router.Handlers, EventGetData)

		// Test the handler
		msg := Message{ID: "test", Event: EventGetData}
		response := router.HandleMessage("test-conn", msg)
		assert.Equal(t, "simple handler response", response.Data)
	})
}

func TestMessageRouter_HandleMessage(t *testing.T) {
	t.Run("Handle message with registered handler", func(t *testing.T) {
		router := NewMessageRouter()

		testHandler := func(connection string, message Message) MessageResponse {
			return MessageResponse{
				ID:      message.ID,
				Type:    ResponseTypeDataGet,
				Subtype: ResponseSubtypeNone,
				Data:    map[string]interface{}{"processed": true, "connection": connection},
				Message: "Message processed successfully",
			}
		}

		router.RegisterHandler(EventGetData, testHandler)

		msg := Message{
			ID:    "msg-123",
			Event: EventGetData,
			Data:  map[string]string{"request": "data"},
		}

		response := router.HandleMessage("conn-456", msg)

		assert.Equal(t, "msg-123", response.ID)
		assert.Equal(t, ResponseTypeDataGet, response.Type)
		assert.Equal(t, ResponseSubtypeNone, response.Subtype)
		assert.Equal(t, "Message processed successfully", response.Message)

		responseData, ok := response.Data.(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, true, responseData["processed"])
		assert.Equal(t, "conn-456", responseData["connection"])
	})

	t.Run("Handle message with unregistered event", func(t *testing.T) {
		router := NewMessageRouter()

		msg := Message{
			ID:    "msg-404",
			Event: EventGetData, // No handler registered for this event
			Data:  "test data",
		}

		response := router.HandleMessage("test-conn", msg)

		assert.Equal(t, "msg-404", response.ID)
		assert.Equal(t, ResponseTypeError, response.Type)
		assert.Equal(t, "Method not found", response.Message)

		responseData, ok := response.Data.(map[string]Message)
		require.True(t, ok)
		assert.Equal(t, msg, responseData["message"])
	})

	t.Run("Handle multiple different messages", func(t *testing.T) {
		router := NewMessageRouter()

		// Register handlers for different events
		router.RegisterHandler(EventGetData, func(connection string, message Message) MessageResponse {
			return MessageResponse{ID: message.ID, Type: ResponseTypeDataGet, Data: "data response"}
		})

		router.RegisterHandler(EventGetSettings, func(connection string, message Message) MessageResponse {
			return MessageResponse{ID: message.ID, Type: ResponseTypeSettingsResult, Data: "settings response"}
		})

		// Test first event
		msg1 := Message{ID: "1", Event: EventGetData}
		response1 := router.HandleMessage("conn1", msg1)
		assert.Equal(t, "data response", response1.Data)

		// Test second event
		msg2 := Message{ID: "2", Event: EventGetSettings}
		response2 := router.HandleMessage("conn2", msg2)
		assert.Equal(t, "settings response", response2.Data)
	})
}

func TestEventTypes(t *testing.T) {
	t.Run("Event type constants", func(t *testing.T) {
		// Test that event type constants are properly defined
		assert.Equal(t, EventType("EXIT_APPLICATION"), EventExitApplication)
		assert.Equal(t, EventType("GET_DATA"), EventGetData)
		assert.Equal(t, EventType("GET_DIRECTORIES"), EventGetDirectories)
		assert.Equal(t, EventType("GET_DIRECTORY"), EventGetDirectory)
		assert.Equal(t, EventType("GET_FILES"), EventGetFiles)
		assert.Equal(t, EventType("GET_FILE"), EventGetFile)
		assert.Equal(t, EventType("GET_SETTINGS"), EventGetSettings)
		assert.Equal(t, EventType("KEYBOARD_KEYPRESS"), EventKeyboardKeypress)
		assert.Equal(t, EventType("KEYBOARD_TEXT"), EventKeyboardText)
		assert.Equal(t, EventType("MEDIA_CONTROL"), EventMediaControl)
		assert.Equal(t, EventType("NOTIFICATION"), EventNotification)
		assert.Equal(t, EventType("OPEN"), EventOpen)
		assert.Equal(t, EventType("POWER_HIBERNATE"), EventPowerHibernate)
		assert.Equal(t, EventType("POWER_LOCK"), EventPowerLock)
		assert.Equal(t, EventType("POWER_LOGOUT"), EventPowerLogout)
		assert.Equal(t, EventType("POWER_RESTART"), EventPowerRestart)
		assert.Equal(t, EventType("POWER_SHUTDOWN"), EventPowerShutdown)
		assert.Equal(t, EventType("POWER_SLEEP"), EventPowerSleep)
		assert.Equal(t, EventType("REGISTER_DATA_LISTENER"), EventRegisterDataListener)
		assert.Equal(t, EventType("UNREGISTER_DATA_LISTENER"), EventUnregisterDataListener)
		assert.Equal(t, EventType("DATA_UPDATE"), EventDataUpdate)
		assert.Equal(t, EventType("UPDATE_SETTINGS"), EventUpdateSettings)
	})
}

func TestMessageRouterIntegration(t *testing.T) {
	t.Run("Complete message handling workflow", func(t *testing.T) {
		router := NewMessageRouter()

		// Register a complex handler that processes different types of data
		router.RegisterHandler(EventGetData, func(connection string, message Message) MessageResponse {
			// Extract module name from message data
			data, ok := message.Data.(map[string]interface{})
			if !ok {
				return MessageResponse{
					ID:      message.ID,
					Type:    ResponseTypeError,
					Message: "Invalid data format",
				}
			}

			moduleName, exists := data["module"]
			if !exists {
				return MessageResponse{
					ID:      message.ID,
					Type:    ResponseTypeError,
					Message: "Module name not specified",
				}
			}

			return MessageResponse{
				ID:      message.ID,
				Type:    ResponseTypeDataGet,
				Subtype: ResponseSubtypeNone,
				Data:    map[string]interface{}{"module": moduleName, "status": "success"},
				Module:  types.ModuleName(moduleName.(string)),
			}
		})

		// Test successful request
		msg := Message{
			ID:    "integration-test",
			Event: EventGetData,
			Data: map[string]interface{}{
				"module": "cpu",
			},
		}

		response := router.HandleMessage("test-connection", msg)

		assert.Equal(t, "integration-test", response.ID)
		assert.Equal(t, ResponseTypeDataGet, response.Type)
		assert.Equal(t, ResponseSubtypeNone, response.Subtype)
		assert.Equal(t, types.ModuleName("cpu"), response.Module)

		responseData, ok := response.Data.(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "cpu", responseData["module"])
		assert.Equal(t, "success", responseData["status"])
	})
}
