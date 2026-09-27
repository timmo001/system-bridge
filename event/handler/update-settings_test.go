package event_handler

import (
	"testing"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
)

func TestUpdateSettingsPreservesTrayForOlderClients(t *testing.T) {
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", t.TempDir())
	viper.Reset()
	t.Cleanup(viper.Reset)
	cfg, err := settings.Load()
	require.NoError(t, err)
	router := event.NewMessageRouter()
	RegisterUpdateSettingsHandler(router)
	for _, enabled := range []bool{true, false} {
		cfg.SystemTray = enabled
		require.NoError(t, cfg.Save())
		response := router.HandleMessage("test", event.Message{
			ID: "settings", Event: event.EventUpdateSettings,
			Data: map[string]interface{}{"logLevel": "WARN"},
		})
		require.Equal(t, event.ResponseTypeSettingsUpdated, response.Type)
		cfg, err = settings.Load()
		require.NoError(t, err)
		require.Equal(t, enabled, cfg.SystemTray)
		require.Equal(t, enabled, settingsToFrontend(cfg)["systemTray"])
	}
}
