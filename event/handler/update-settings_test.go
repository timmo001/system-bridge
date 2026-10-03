package event_handler

import (
	"os"
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

func TestUpdateSettingsPartialPayloadPreservesOtherFields(t *testing.T) {
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", t.TempDir())
	viper.Reset()
	t.Cleanup(viper.Reset)

	mediaDir := t.TempDir()
	commandPath := "/bin/echo"
	if _, err := os.Stat(commandPath); err != nil {
		commandPath = "/usr/bin/echo"
	}
	truePath := "/bin/true"
	if _, err := os.Stat(truePath); err != nil {
		truePath = "/usr/bin/true"
	}

	cfg, err := settings.Load()
	require.NoError(t, err)
	cfg.Autostart = true
	cfg.SystemTray = true
	cfg.LogLevel = settings.LogLevelError
	cfg.Hotkeys = []settings.SettingsHotkey{{Name: "open", Key: "ctrl+shift+o"}}
	cfg.Commands.Allowlist = []settings.SettingsCommandDefinition{
		{ID: "echo", Name: "Echo", Command: commandPath},
		{ID: "true", Name: "True", Command: truePath},
	}
	cfg.Disks.AllowedSecondaryMountPoints = []string{"/mnt/data"}
	cfg.Media.Directories = []settings.SettingsMediaDirectory{{Name: "Music", Path: mediaDir}}
	require.NoError(t, cfg.Save())

	router := event.NewMessageRouter()
	RegisterUpdateSettingsHandler(router)
	response := router.HandleMessage("test", event.Message{
		ID: "settings", Event: event.EventUpdateSettings,
		Data: map[string]any{
			"autostart": true,
			"logLevel":  "INFO",
		},
	})
	require.Equal(t, event.ResponseTypeSettingsUpdated, response.Type)

	loaded, err := settings.Load()
	require.NoError(t, err)
	require.True(t, loaded.Autostart)
	require.True(t, loaded.SystemTray)
	require.Equal(t, settings.LogLevelInfo, loaded.LogLevel)
	require.Equal(t, cfg.Hotkeys, loaded.Hotkeys)
	require.Equal(t, cfg.Commands.Allowlist, loaded.Commands.Allowlist)
	require.Equal(t, cfg.Disks.AllowedSecondaryMountPoints, loaded.Disks.AllowedSecondaryMountPoints)
	require.Equal(t, cfg.Media.Directories, loaded.Media.Directories)

	response = router.HandleMessage("test", event.Message{
		ID: "settings-replace", Event: event.EventUpdateSettings,
		Data: map[string]any{
			"hotkeys": []any{
				map[string]any{"name": "close", "key": "ctrl+shift+c"},
			},
			"commands": map[string]any{
				"allowlist": []any{
					map[string]any{"id": "echo", "name": "Echo", "command": commandPath},
				},
			},
		},
	})
	require.Equal(t, event.ResponseTypeSettingsUpdated, response.Type)

	loaded, err = settings.Load()
	require.NoError(t, err)
	require.Equal(t, []settings.SettingsHotkey{{Name: "close", Key: "ctrl+shift+c"}}, loaded.Hotkeys)
	require.Equal(t, []settings.SettingsCommandDefinition{{
		ID: "echo", Name: "Echo", Command: commandPath,
	}}, loaded.Commands.Allowlist)
	require.Equal(t, cfg.Media.Directories, loaded.Media.Directories)

	response = router.HandleMessage("test", event.Message{
		ID: "settings-clear", Event: event.EventUpdateSettings,
		Data: map[string]any{
			"systemTray": false,
			"commands": map[string]any{
				"allowlist": []any{},
			},
		},
	})
	require.Equal(t, event.ResponseTypeSettingsUpdated, response.Type)

	loaded, err = settings.Load()
	require.NoError(t, err)
	require.False(t, loaded.SystemTray)
	require.Empty(t, loaded.Commands.Allowlist)
	require.True(t, loaded.Autostart)
	require.Equal(t, settings.LogLevelInfo, loaded.LogLevel)
	require.Equal(t, []settings.SettingsHotkey{{Name: "close", Key: "ctrl+shift+c"}}, loaded.Hotkeys)
	require.Equal(t, cfg.Disks.AllowedSecondaryMountPoints, loaded.Disks.AllowedSecondaryMountPoints)
	require.Equal(t, cfg.Media.Directories, loaded.Media.Directories)
}
