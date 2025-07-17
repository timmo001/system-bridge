package utils

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"runtime"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateToken(t *testing.T) {
	t.Run("Generate valid UUID token", func(t *testing.T) {
		token := GenerateToken()

		// Check that it's not empty
		assert.NotEmpty(t, token)

		// Check that it's a valid UUID format
		_, err := uuid.Parse(token)
		assert.NoError(t, err)
	})

	t.Run("Generate unique tokens", func(t *testing.T) {
		token1 := GenerateToken()
		token2 := GenerateToken()

		// Tokens should be different
		assert.NotEqual(t, token1, token2)
	})
}

func TestGetTokenFilePath(t *testing.T) {
	t.Run("Get token file path successfully", func(t *testing.T) {
		// Create a temporary directory for testing
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)

		// Set the config directory to our temp directory
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

		tokenPath, err := GetTokenFilePath()
		require.NoError(t, err)

		expectedPath := filepath.Join(tempDir, "token")
		assert.Equal(t, expectedPath, tokenPath)
	})

	t.Run("Handle config path error", func(t *testing.T) {
		// Unset all relevant environment variables to force an error
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", "")
		t.Setenv("XDG_DATA_HOME", "")
		t.Setenv("HOME", "")
		t.Setenv("LOCALAPPDATA", "")

		_, err := GetTokenFilePath()
		assert.Error(t, err)
	})
}

func TestLoadToken(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	t.Run("Load token when file doesn't exist", func(t *testing.T) {
		token, err := LoadToken()
		require.NoError(t, err)

		// Should generate a new token
		assert.NotEmpty(t, token)

		// Should be a valid UUID
		_, err = uuid.Parse(token)
		assert.NoError(t, err)

		// Token file should now exist
		tokenPath := filepath.Join(tempDir, "token")
		assert.FileExists(t, tokenPath)

		// File should contain the token
		content, err := os.ReadFile(tokenPath)
		require.NoError(t, err)
		assert.Equal(t, token, strings.TrimSpace(string(content)))
	})

	t.Run("Load existing token", func(t *testing.T) {
		// Create a token file with a known token
		existingToken := "existing-token-12345"
		tokenPath := filepath.Join(tempDir, "token")
		err := os.WriteFile(tokenPath, []byte(existingToken), 0600)
		require.NoError(t, err)

		token, err := LoadToken()
		require.NoError(t, err)

		assert.Equal(t, existingToken, token)
	})

	t.Run("Load token when file is empty", func(t *testing.T) {
		// Create an empty token file
		tokenPath := filepath.Join(tempDir, "token")
		err := os.WriteFile(tokenPath, []byte(""), 0600)
		require.NoError(t, err)

		token, err := LoadToken()
		require.NoError(t, err)

		// Should generate a new token
		assert.NotEmpty(t, token)

		// Should be a valid UUID
		_, err = uuid.Parse(token)
		assert.NoError(t, err)

		// File should now contain the new token
		content, err := os.ReadFile(tokenPath)
		require.NoError(t, err)
		assert.Equal(t, token, strings.TrimSpace(string(content)))
	})

	t.Run("Load token with whitespace", func(t *testing.T) {
		// Create a token file with whitespace
		tokenWithWhitespace := "  token-with-whitespace  \n"
		expectedToken := "token-with-whitespace"
		tokenPath := filepath.Join(tempDir, "token")
		err := os.WriteFile(tokenPath, []byte(tokenWithWhitespace), 0600)
		require.NoError(t, err)

		token, err := LoadToken()
		require.NoError(t, err)

		assert.Equal(t, expectedToken, token)
	})
}

func TestSaveToken(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	t.Run("Save token successfully", func(t *testing.T) {
		if runtime.GOOS == "windows" {
			t.Skip("Permission bits are not enforced on Windows; skipping test.")
		}
		testToken := "test-token-12345"

		err := SaveToken(testToken)
		require.NoError(t, err)

		// Verify file was created
		tokenPath := filepath.Join(tempDir, "token")
		assert.FileExists(t, tokenPath)

		// Verify file content
		content, err := os.ReadFile(tokenPath)
		require.NoError(t, err)
		assert.Equal(t, testToken, string(content))

		// Verify file permissions (should be 0600)
		info, err := os.Stat(tokenPath)
		require.NoError(t, err)
		assert.Equal(t, os.FileMode(0600), info.Mode().Perm())
	})

	t.Run("Save token creates directory if it doesn't exist", func(t *testing.T) {
		// Use a nested directory that doesn't exist
		nestedDir := filepath.Join(tempDir, "nested", "config")
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", nestedDir)

		testToken := "test-token-nested"

		err := SaveToken(testToken)
		require.NoError(t, err)

		// Verify directory was created
		assert.DirExists(t, nestedDir)

		// Verify file was created
		tokenPath := filepath.Join(nestedDir, "token")
		assert.FileExists(t, tokenPath)

		// Verify file content
		content, err := os.ReadFile(tokenPath)
		require.NoError(t, err)
		assert.Equal(t, testToken, string(content))
	})
}

func TestGetPort(t *testing.T) {
	t.Run("Get default port when environment variable not set", func(t *testing.T) {
		t.Setenv("SYSTEM_BRIDGE_PORT", "")

		port := GetPort()
		assert.Equal(t, 9170, port)
	})

	t.Run("Get port from environment variable", func(t *testing.T) {
		t.Setenv("SYSTEM_BRIDGE_PORT", "8080")

		port := GetPort()
		assert.Equal(t, 8080, port)
	})

	t.Run("Get default port when environment variable is invalid", func(t *testing.T) {
		t.Setenv("SYSTEM_BRIDGE_PORT", "invalid")

		port := GetPort()
		assert.Equal(t, 9170, port)
	})

	t.Run("Get default port when environment variable is out of range - too low", func(t *testing.T) {
		t.Setenv("SYSTEM_BRIDGE_PORT", "0")

		port := GetPort()
		assert.Equal(t, 9170, port)
	})

	t.Run("Get default port when environment variable is out of range - too high", func(t *testing.T) {
		t.Setenv("SYSTEM_BRIDGE_PORT", "65536")

		port := GetPort()
		assert.Equal(t, 9170, port)
	})

	t.Run("Get valid port from environment variable - edge cases", func(t *testing.T) {
		// Test minimum valid port
		t.Setenv("SYSTEM_BRIDGE_PORT", "1")
		port := GetPort()
		assert.Equal(t, 1, port)

		// Test maximum valid port
		t.Setenv("SYSTEM_BRIDGE_PORT", "65535")
		port = GetPort()
		assert.Equal(t, 65535, port)
	})
}

func TestTokenIntegration(t *testing.T) {
	t.Run("Complete token workflow", func(t *testing.T) {
		// Create a temporary directory for testing
		tempDir, err := os.MkdirTemp("", "system-bridge-test-*")
		require.NoError(t, err)
		defer os.RemoveAll(tempDir)

		// Set the config directory to our temp directory
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

		// Load token (should generate new one)
		token1, err := LoadToken()
		require.NoError(t, err)
		assert.NotEmpty(t, token1)

		// Load token again (should get the same one)
		token2, err := LoadToken()
		require.NoError(t, err)
		assert.Equal(t, token1, token2)

		// Save a new token
		newToken := "custom-token-12345"
		err = SaveToken(newToken)
		require.NoError(t, err)

		// Load token again (should get the new one)
		token3, err := LoadToken()
		require.NoError(t, err)
		assert.Equal(t, newToken, token3)
	})
}
