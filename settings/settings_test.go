package settings

import (
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer func() {
		err := os.RemoveAll(tempDir)
		if err != nil {
			t.Fatalf("failed to remove temp dir: %v", err)
		}
	}()

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
		assert.Equal(t, LogLevelWarn, settings.LogLevel)
		assert.Empty(t, settings.Media.Directories)
	})

	t.Run("Load existing config file", func(t *testing.T) {
		// Create a temporary media directory
		mediaDir, err := os.MkdirTemp("", "media-test-*")
		require.NoError(t, err)
		defer func() {
			err := os.RemoveAll(mediaDir)
			if err != nil {
				t.Fatalf("failed to remove media dir: %v", err)
			}
		}()

		// Create a config file with custom values
		configContent := `{
			"autostart": true,
			"logLevel": "DEBUG",
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
						"path": "` + mediaDir + `"
					}
				]
			}
		}`

		configPath := filepath.Join(tempDir, "settings.json")
		err = os.WriteFile(configPath, []byte(configContent), 0644)
		require.NoError(t, err)

		// Reset viper and load again
		viper.Reset()
		settings, err := Load()
		require.NoError(t, err)

		assert.True(t, settings.Autostart)
		assert.Equal(t, LogLevelDebug, settings.LogLevel)
		assert.Len(t, settings.Hotkeys, 1)
		assert.Equal(t, "test-hotkey", settings.Hotkeys[0].Name)
		assert.Equal(t, "ctrl+shift+t", settings.Hotkeys[0].Key)
		assert.Len(t, settings.Media.Directories, 1)
		assert.Equal(t, "Music", settings.Media.Directories[0].Name)
		assert.Equal(t, mediaDir, settings.Media.Directories[0].Path)
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
	defer func() {
		err := os.RemoveAll(tempDir)
		if err != nil {
			t.Fatalf("failed to remove temp dir: %v", err)
		}
	}()

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	// Reset viper state for clean test
	viper.Reset()

	t.Run("Save settings successfully", func(t *testing.T) {
		// Create a temporary media directory
		mediaDir, err := os.MkdirTemp("", "media-test-*")
		require.NoError(t, err)
		defer func() {
			err := os.RemoveAll(mediaDir)
			if err != nil {
				t.Fatalf("failed to remove media dir: %v", err)
			}
		}()

		// Load default settings first
		settings, err := Load()
		require.NoError(t, err)

		// Modify settings
		settings.Autostart = true
		settings.LogLevel = LogLevelDebug
		settings.Hotkeys = []SettingsHotkey{
			{Name: "test", Key: "ctrl+t"},
		}
		settings.Media.Directories = []SettingsMediaDirectory{
			{Name: "Videos", Path: mediaDir},
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
		assert.Equal(t, LogLevelDebug, loadedSettings.LogLevel)
		assert.Len(t, loadedSettings.Hotkeys, 1)
		assert.Equal(t, "test", loadedSettings.Hotkeys[0].Name)
		assert.Equal(t, "ctrl+t", loadedSettings.Hotkeys[0].Key)
		assert.Len(t, loadedSettings.Media.Directories, 1)
		assert.Equal(t, "Videos", loadedSettings.Media.Directories[0].Name)
		assert.Equal(t, mediaDir, loadedSettings.Media.Directories[0].Path)
	})

	t.Run("Save rejects settings with duplicate command IDs", func(t *testing.T) {
		// Reset viper and delete config file for clean test state
		viper.Reset()
		configPath := filepath.Join(tempDir, "settings.json")
		_ = os.Remove(configPath)

		// Load default settings first
		settings, err := Load()
		require.NoError(t, err)

		// Add commands with duplicate IDs (use absolute path to pass path validation)
		settings.Commands.Allowlist = []SettingsCommandDefinition{
			{ID: "cmd1", Name: "Command 1", Command: "/bin/echo"},
			{ID: "cmd1", Name: "Command 2", Command: "/bin/echo"},
		}

		// Attempt to save should fail
		err = settings.Save()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "duplicate command ID")
	})

	t.Run("Save rejects settings with empty command ID", func(t *testing.T) {
		// Reset viper and delete config file for clean test state
		viper.Reset()
		configPath := filepath.Join(tempDir, "settings.json")
		_ = os.Remove(configPath)

		// Load default settings first
		settings, err := Load()
		require.NoError(t, err)

		// Add command with empty ID
		settings.Commands.Allowlist = []SettingsCommandDefinition{
			{ID: "", Name: "Command", Command: "echo test"},
		}

		// Attempt to save should fail
		err = settings.Save()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty ID")
	})

	t.Run("Save rejects settings with empty command name", func(t *testing.T) {
		// Reset viper and delete config file for clean test state
		viper.Reset()
		configPath := filepath.Join(tempDir, "settings.json")
		_ = os.Remove(configPath)

		// Load default settings first
		settings, err := Load()
		require.NoError(t, err)

		// Add command with empty name
		settings.Commands.Allowlist = []SettingsCommandDefinition{
			{ID: "cmd1", Name: "", Command: "echo test"},
		}

		// Attempt to save should fail
		err = settings.Save()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty name")
	})

	t.Run("Save rejects settings with empty command", func(t *testing.T) {
		// Reset viper and delete config file for clean test state
		viper.Reset()
		configPath := filepath.Join(tempDir, "settings.json")
		_ = os.Remove(configPath)

		// Load default settings first
		settings, err := Load()
		require.NoError(t, err)

		// Add command with empty command
		settings.Commands.Allowlist = []SettingsCommandDefinition{
			{ID: "cmd1", Name: "Command 1", Command: ""},
		}

		// Attempt to save should fail
		err = settings.Save()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty command")
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
			LogLevel:  LogLevelWarn,
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
		assert.Equal(t, LogLevelWarn, settings.LogLevel)
		assert.Len(t, settings.Hotkeys, 1)
		assert.Len(t, settings.Media.Directories, 1)
	})
}

func TestLogLevel(t *testing.T) {
	t.Run("LogLevel constants", func(t *testing.T) {
		assert.Equal(t, LogLevel("DEBUG"), LogLevelDebug)
		assert.Equal(t, LogLevel("INFO"), LogLevelInfo)
		assert.Equal(t, LogLevel("WARN"), LogLevelWarn)
		assert.Equal(t, LogLevel("ERROR"), LogLevelError)
	})

	t.Run("ToSlogLevel", func(t *testing.T) {
		assert.Equal(t, slog.LevelDebug, LogLevelDebug.ToSlogLevel())
		assert.Equal(t, slog.LevelInfo, LogLevelInfo.ToSlogLevel())
		assert.Equal(t, slog.LevelWarn, LogLevelWarn.ToSlogLevel())
		assert.Equal(t, slog.LevelError, LogLevelError.ToSlogLevel())
		assert.Equal(t, slog.LevelInfo, LogLevel("INVALID").ToSlogLevel())
	})

	t.Run("FromSlogLevel", func(t *testing.T) {
		assert.Equal(t, LogLevelDebug, FromSlogLevel(slog.LevelDebug))
		assert.Equal(t, LogLevelInfo, FromSlogLevel(slog.LevelInfo))
		assert.Equal(t, LogLevelWarn, FromSlogLevel(slog.LevelWarn))
		assert.Equal(t, LogLevelError, FromSlogLevel(slog.LevelError))
		assert.Equal(t, LogLevelInfo, FromSlogLevel(slog.Level(999)))
	})

	t.Run("ParseLogLevel", func(t *testing.T) {
		level, err := ParseLogLevel("DEBUG")
		assert.NoError(t, err)
		assert.Equal(t, LogLevelDebug, level)

		level, err = ParseLogLevel("INFO")
		assert.NoError(t, err)
		assert.Equal(t, LogLevelInfo, level)

		level, err = ParseLogLevel("WARN")
		assert.NoError(t, err)
		assert.Equal(t, LogLevelWarn, level)

		level, err = ParseLogLevel("ERROR")
		assert.NoError(t, err)
		assert.Equal(t, LogLevelError, level)

		// Test case insensitive
		level, err = ParseLogLevel("debug")
		assert.NoError(t, err)
		assert.Equal(t, LogLevelDebug, level)

		// Test invalid level
		level, err = ParseLogLevel("INVALID")
		assert.Error(t, err)
		assert.Equal(t, LogLevelInfo, level)
	})
}
