package event_handler

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type fakeDataListenerRegistry struct {
	registeredConnection   string
	registeredModules      []types.ModuleName
	unregisteredConnection string
}

func (f *fakeDataListenerRegistry) RegisterDataListener(connection string, modules []types.ModuleName) {
	f.registeredConnection = connection
	f.registeredModules = append([]types.ModuleName(nil), modules...)
}

func (f *fakeDataListenerRegistry) UnregisterDataListener(connection string) {
	f.unregisteredConnection = connection
}

func TestRegisterDataListenerHandler(t *testing.T) {
	t.Run("registers listener with decoded modules", func(t *testing.T) {
		registry := &fakeDataListenerRegistry{}
		router := event.NewMessageRouter()
		RegisterRegisterDataListenerHandler(router, registry)

		msg := event.Message{
			ID:    "register-1",
			Event: event.EventRegisterDataListener,
			Data: map[string]interface{}{
				"modules": []string{"cpu", "memory"},
			},
		}

		response := router.HandleMessage("conn-1", msg)

		assert.Equal(t, event.ResponseTypeDataListenerRegistered, response.Type)
		assert.Equal(t, "Listener registered", response.Message)
		assert.Equal(t, "conn-1", registry.registeredConnection)
		assert.Equal(t, []types.ModuleName{types.ModuleCPU, types.ModuleMemory}, registry.registeredModules)

		data, ok := response.Data.(RegisterDataListenerRequestData)
		require.True(t, ok)
		assert.Equal(t, []types.ModuleName{types.ModuleCPU, types.ModuleMemory}, data.Modules)
	})

	t.Run("returns bad request for invalid payload", func(t *testing.T) {
		registry := &fakeDataListenerRegistry{}
		router := event.NewMessageRouter()
		RegisterRegisterDataListenerHandler(router, registry)

		msg := event.Message{
			ID:    "register-2",
			Event: event.EventRegisterDataListener,
			Data:  "invalid",
		}

		response := router.HandleMessage("conn-2", msg)

		assert.Equal(t, event.ResponseTypeError, response.Type)
		assert.Equal(t, event.ResponseSubtypeBadRequest, response.Subtype)
		assert.Empty(t, registry.registeredConnection)
		assert.Nil(t, registry.registeredModules)
	})
}

func TestUnregisterDataListenerHandler(t *testing.T) {
	registry := &fakeDataListenerRegistry{}
	router := event.NewMessageRouter()
	RegisterUnregisterDataListenerHandler(router, registry)

	msg := event.Message{
		ID:    "unregister-1",
		Event: event.EventUnregisterDataListener,
	}

	response := router.HandleMessage("conn-3", msg)

	assert.Equal(t, event.ResponseTypeDataListenerUnregistered, response.Type)
	assert.Equal(t, "Listener unregistered", response.Message)
	assert.Equal(t, "conn-3", registry.unregisteredConnection)
}
