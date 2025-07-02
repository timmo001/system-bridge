package settings

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/charmbracelet/log"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	// Reset viper state for clean test
	viper.Reset()

	t.Run("Load with default values when config file doesn't exist", func(t *testing.T) {
		settings, err := Load()
		require.NoError(t, err)
		assert.NotNil(t, settings)
		
		// Check default values
		assert.False(t, settings.Autostart)
		assert.Empty(t, settings.Hotkeys)
		assert.Equal(t, log.InfoLevel, settings.LogLevel)
		assert.Empty(t, settings.Media.Directories)
	})

	t.Run("Load existing config file", func(t *testing.T) {
		// Create a config file with custom values
		configContent := `{
			"autostart": true,
			"logLevel": -1,
			"hotkeys": [
				{
					"name": "test-hotkey",
					"key": "ctrl+shift+t"
				}
			],
			"media": {
				"directories": [
					{
						"name": "Music",
						"path": "/home/user/Music"
					}
				]
			}
		}`
		
		configPath := filepath.Join(tempDir, "settings.json")
		err := os.WriteFile(configPath, []byte(configContent), 0644)
		require.NoError(t, err)

		// Reset viper and load again
		viper.Reset()
		settings, err := Load()
		require.NoError(t, err)
		
		assert.True(t, settings.Autostart)
		assert.Equal(t, log.Level(-1), settings.LogLevel)
		assert.Len(t, settings.Hotkeys, 1)
		assert.Equal(t, "test-hotkey", settings.Hotkeys[0].Name)
		assert.Equal(t, "ctrl+shift+t", settings.Hotkeys[0].Key)
		assert.Len(t, settings.Media.Directories, 1)
		assert.Equal(t, "Music", settings.Media.Directories[0].Name)
		assert.Equal(t, "/home/user/Music", settings.Media.Directories[0].Path)
	})

	t.Run("Load with invalid config file", func(t *testing.T) {
		// Create an invalid config file
		invalidConfigContent := `{invalid json`
		configPath := filepath.Join(tempDir, "settings.json")
		err := os.WriteFile(configPath, []byte(invalidConfigContent), 0644)
		require.NoError(t, err)

		// Reset viper
		viper.Reset()
		settings, err := Load()
		assert.Error(t, err)
		assert.Nil(t, settings)
	})
}

func TestSave(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	// Reset viper state for clean test
	viper.Reset()

	t.Run("Save settings successfully", func(t *testing.T) {
		// Load default settings first
		settings, err := Load()
		require.NoError(t, err)

		// Modify settings
		settings.Autostart = true
		settings.LogLevel = log.Level(-1)
		settings.Hotkeys = []SettingsHotkey{
			{Name: "test", Key: "ctrl+t"},
		}
		settings.Media.Directories = []SettingsMediaDirectory{
			{Name: "Videos", Path: "/home/user/Videos"},
		}

		// Save settings
		err = settings.Save()
		require.NoError(t, err)

		// Verify file was created
		configPath := filepath.Join(tempDir, "settings.json")
		assert.FileExists(t, configPath)

		// Reset viper and load again to verify saved values
		viper.Reset()
		loadedSettings, err := Load()
		require.NoError(t, err)

		assert.True(t, loadedSettings.Autostart)
		assert.Equal(t, log.Level(-1), loadedSettings.LogLevel)
		assert.Len(t, loadedSettings.Hotkeys, 1)
		assert.Equal(t, "test", loadedSettings.Hotkeys[0].Name)
		assert.Equal(t, "ctrl+t", loadedSettings.Hotkeys[0].Key)
		assert.Len(t, loadedSettings.Media.Directories, 1)
		assert.Equal(t, "Videos", loadedSettings.Media.Directories[0].Name)
		assert.Equal(t, "/home/user/Videos", loadedSettings.Media.Directories[0].Path)
	})
}

func TestSettingsStructs(t *testing.T) {
	t.Run("SettingsHotkey struct", func(t *testing.T) {
		hotkey := SettingsHotkey{
			Name: "test-hotkey",
			Key:  "ctrl+shift+t",
		}
		assert.Equal(t, "test-hotkey", hotkey.Name)
		assert.Equal(t, "ctrl+shift+t", hotkey.Key)
	})

	t.Run("SettingsMediaDirectory struct", func(t *testing.T) {
		dir := SettingsMediaDirectory{
			Name: "Music",
			Path: "/home/user/Music",
		}
		assert.Equal(t, "Music", dir.Name)
		assert.Equal(t, "/home/user/Music", dir.Path)
	})

	t.Run("SettingsMedia struct", func(t *testing.T) {
		media := SettingsMedia{
			Directories: []SettingsMediaDirectory{
				{Name: "Music", Path: "/music"},
				{Name: "Videos", Path: "/videos"},
			},
		}
		assert.Len(t, media.Directories, 2)
		assert.Equal(t, "Music", media.Directories[0].Name)
		assert.Equal(t, "Videos", media.Directories[1].Name)
	})

	t.Run("Settings struct", func(t *testing.T) {
		settings := Settings{
			Autostart: true,
			LogLevel:  log.WarnLevel,
			Hotkeys: []SettingsHotkey{
				{Name: "test", Key: "ctrl+t"},
			},
			Media: SettingsMedia{
				Directories: []SettingsMediaDirectory{
					{Name: "Downloads", Path: "/downloads"},
				},
			},
		}
		
		assert.True(t, settings.Autostart)
		assert.Equal(t, log.WarnLevel, settings.LogLevel)
		assert.Len(t, settings.Hotkeys, 1)
		assert.Len(t, settings.Media.Directories, 1)
	})
}