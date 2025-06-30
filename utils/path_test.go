package utils

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetConfigPath(t *testing.T) {
	t.Run("Get config path with custom environment variable", func(t *testing.T) {
		// Create a temporary directory instead of trying to create in root
		tempDir, err := os.MkdirTemp("", "custom-config-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)
		
		customPath := filepath.Join(tempDir, "config")
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", customPath)
		
		configPath, err := GetConfigPath()
		require.NoError(t, err)
		assert.Equal(t, customPath, configPath)
		assert.DirExists(t, configPath)
	})

	t.Run("Get config path with platform-specific defaults", func(t *testing.T) {
		// Clear custom config dir
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", "")
		
		switch runtime.GOOS {
		case "windows":
			// Test Windows path
			tempAppData, err := os.MkdirTemp("", "localappdata-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempAppData)
			
			t.Setenv("LOCALAPPDATA", tempAppData)
			
			configPath, err := GetConfigPath()
			require.NoError(t, err)
			
			expectedPath := filepath.Join(tempAppData, "system-bridge", "v5")
			assert.Equal(t, expectedPath, configPath)
			assert.DirExists(t, configPath)

		case "darwin":
			// Test macOS path
			tempHome, err := os.MkdirTemp("", "home-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempHome)
			
			t.Setenv("HOME", tempHome)
			t.Setenv("XDG_DATA_HOME", "") // Clear XDG to test default macOS behavior
			
			configPath, err := GetConfigPath()
			require.NoError(t, err)
			
			expectedPath := filepath.Join(tempHome, "Library", "Application Support", "system-bridge", "v5")
			assert.Equal(t, expectedPath, configPath)
			assert.DirExists(t, configPath)

		default:
			// Test Linux/Unix path
			tempHome, err := os.MkdirTemp("", "home-*")
			require.NoError(t, err)
			defer os.RemoveAll(tempHome)
			
			t.Setenv("HOME", tempHome)
			t.Setenv("XDG_DATA_HOME", "") // Clear XDG to test default behavior
			
			configPath, err := GetConfigPath()
			require.NoError(t, err)
			
			expectedPath := filepath.Join(tempHome, ".local", "share", "system-bridge", "v5")
			assert.Equal(t, expectedPath, configPath)
			assert.DirExists(t, configPath)
		}
	})

	t.Run("Get config path with XDG_DATA_HOME", func(t *testing.T) {
		// This should work on all platforms
		tempXDG, err := os.MkdirTemp("", "xdg-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempXDG)
		
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", "")
		t.Setenv("XDG_DATA_HOME", tempXDG)
		
		configPath, err := GetConfigPath()
		require.NoError(t, err)
		
		expectedPath := filepath.Join(tempXDG, "system-bridge", "v5")
		assert.Equal(t, expectedPath, configPath)
		assert.DirExists(t, configPath)
	})

	t.Run("Error when no valid environment variables", func(t *testing.T) {
		// Clear all relevant environment variables
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", "")
		t.Setenv("XDG_DATA_HOME", "")
		t.Setenv("HOME", "")
		t.Setenv("LOCALAPPDATA", "")
		
		_, err := GetConfigPath()
		assert.Error(t, err)
		
		switch runtime.GOOS {
		case "windows":
			assert.Contains(t, err.Error(), "LOCALAPPDATA")
		default:
			assert.Contains(t, err.Error(), "HOME")
		}
	})

	t.Run("Error when path is not absolute", func(t *testing.T) {
		// Set a relative path
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", "relative/path")
		
		_, err := GetConfigPath()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be absolute")
	})

	t.Run("Creates directory if it doesn't exist", func(t *testing.T) {
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)
		
		configDir := filepath.Join(tempDir, "new", "config", "dir")
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", configDir)
		
		// Directory shouldn't exist initially
		assert.NoDirExists(t, configDir)
		
		configPath, err := GetConfigPath()
		require.NoError(t, err)
		
		assert.Equal(t, configDir, configPath)
		assert.DirExists(t, configPath)
	})
}

func TestGetDataPath(t *testing.T) {
	t.Run("Get data path successfully", func(t *testing.T) {
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)
		
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)
		
		dataPath, err := GetDataPath()
		require.NoError(t, err)
		
		expectedPath := filepath.Join(tempDir, "data")
		assert.Equal(t, expectedPath, dataPath)
		assert.DirExists(t, dataPath)
	})

	t.Run("Creates data directory if it doesn't exist", func(t *testing.T) {
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)
		
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)
		
		dataDir := filepath.Join(tempDir, "data")
		
		// Directory shouldn't exist initially
		assert.NoDirExists(t, dataDir)
		
		dataPath, err := GetDataPath()
		require.NoError(t, err)
		
		assert.Equal(t, dataDir, dataPath)
		assert.DirExists(t, dataPath)
	})

	t.Run("Error when config path fails", func(t *testing.T) {
		// Clear all relevant environment variables to force GetConfigPath to fail
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", "")
		t.Setenv("XDG_DATA_HOME", "")
		t.Setenv("HOME", "")
		t.Setenv("LOCALAPPDATA", "")
		
		_, err := GetDataPath()
		assert.Error(t, err)
	})

	t.Run("Path cleaning works correctly", func(t *testing.T) {
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)
		
		// Set config path with redundant separators
		configPath := tempDir + string(filepath.Separator) + string(filepath.Separator)
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", configPath)
		
		dataPath, err := GetDataPath()
		require.NoError(t, err)
		
		// Path should be cleaned
		expectedPath := filepath.Join(tempDir, "data")
		assert.Equal(t, expectedPath, dataPath)
		assert.DirExists(t, dataPath)
	})
}

func TestPathIntegration(t *testing.T) {
	t.Run("Config and data paths work together", func(t *testing.T) {
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)
		
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)
		
		// Get config path
		configPath, err := GetConfigPath()
		require.NoError(t, err)
		assert.Equal(t, tempDir, configPath)
		assert.DirExists(t, configPath)
		
		// Get data path
		dataPath, err := GetDataPath()
		require.NoError(t, err)
		expectedDataPath := filepath.Join(tempDir, "data")
		assert.Equal(t, expectedDataPath, dataPath)
		assert.DirExists(t, dataPath)
		
		// Verify data path is inside config path
		relPath, err := filepath.Rel(configPath, dataPath)
		require.NoError(t, err)
		assert.Equal(t, "data", relPath)
	})
}

func TestPathPermissions(t *testing.T) {
	t.Run("Created directories have correct permissions", func(t *testing.T) {
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)
		
		configDir := filepath.Join(tempDir, "config")
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", configDir)
		
		// Get config path (should create directory)
		configPath, err := GetConfigPath()
		require.NoError(t, err)
		
		// Check permissions
		info, err := os.Stat(configPath)
		require.NoError(t, err)
		assert.Equal(t, os.FileMode(0755), info.Mode().Perm())
		
		// Get data path (should create directory)
		dataPath, err := GetDataPath()
		require.NoError(t, err)
		
		// Check permissions
		info, err = os.Stat(dataPath)
		require.NoError(t, err)
		assert.Equal(t, os.FileMode(0755), info.Mode().Perm())
	})
}