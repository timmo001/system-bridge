package event_handler

import (
	"testing"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
)

// Two clients changing different commands keep each other's changes, and a
// client changing a command another removed doesn't bring it back
func TestCommandChangesKeepOtherClientsCommands(t *testing.T) {
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", t.TempDir())
	viper.Reset()
	t.Cleanup(viper.Reset)
	_, err := settings.Load()
	require.NoError(t, err)

	router := event.NewMessageRouter()
	RegisterCommandAllowlistHandlers(router)
	send := func(eventType event.EventType, data map[string]any) event.MessageResponse {
		return router.HandleMessage("test", event.Message{ID: "change", Event: eventType, Data: data})
	}
	names := func() map[string]string {
		viper.Reset()
		cfg, err := settings.Load()
		require.NoError(t, err)
		saved := map[string]string{}
		for _, command := range cfg.Commands.Allowlist {
			saved[command.ID] = command.Name
		}
		return saved
	}

	// The lock prefab saves without its tool installed, so this runs anywhere
	lock := func(id string, name string) map[string]any {
		return map[string]any{"id": id, "name": name, "prefab": "lock"}
	}

	require.Equal(t, event.ResponseTypeCommandAdded, send(event.EventCommandAdd, lock("a", "Lock")).Type)
	require.Equal(t, event.ResponseTypeCommandAdded, send(event.EventCommandAdd, lock("b", "Lock too")).Type)
	require.Equal(t, event.ResponseTypeCommandUpdated, send(event.EventCommandUpdate, lock("a", "Lock now")).Type)
	assert.Equal(t, map[string]string{"a": "Lock now", "b": "Lock too"}, names())

	assert.Equal(t, event.ResponseTypeError, send(event.EventCommandAdd, lock("b", "Again")).Type, "an ID can't be added twice")

	require.Equal(t, event.ResponseTypeCommandRemoved, send(event.EventCommandRemove, map[string]any{"id": "b"}).Type)
	assert.Equal(t, event.ResponseTypeError, send(event.EventCommandUpdate, lock("b", "Back")).Type)
	assert.Equal(t, map[string]string{"a": "Lock now"}, names())
}
