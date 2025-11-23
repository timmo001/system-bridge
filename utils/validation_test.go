package utils

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateMediaDirectory(t *testing.T) {
	t.Run("Valid directory", func(t *testing.T) {
		// Create a temporary directory
		tempDir, err := os.MkdirTemp("", "media-validation-test-*")
		require.NoError(t, err)
		defer func() {
			err := os.RemoveAll(tempDir)
			if err != nil {
				t.Fatalf("failed to remove temp dir: %v", err)
			}
		}()

		err = ValidateMediaDirectory(tempDir)
		assert.NoError(t, err)
	})

	t.Run("Non-existent directory", func(t *testing.T) {
		err := ValidateMediaDirectory("/non/existent/path")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "does not exist")
	})

	t.Run("Path is a file, not a directory", func(t *testing.T) {
		// Create a temporary file
		tempFile, err := os.CreateTemp("", "media-file-test-*")
		require.NoError(t, err)
		tempFilePath := tempFile.Name()
		tempFile.Close()
		defer os.Remove(tempFilePath)

		err = ValidateMediaDirectory(tempFilePath)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not a directory")
	})

	t.Run("Path contains '..'", func(t *testing.T) {
		err := ValidateMediaDirectory("/some/path/../other/path")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "'..'")
	})
}

func TestValidateCommand(t *testing.T) {
	t.Run("Valid command", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "echo test")
		assert.NoError(t, err)
	})

	t.Run("Empty ID", func(t *testing.T) {
		err := ValidateCommand("", "Test Command", "echo test")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty ID")
	})

	t.Run("Empty name", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "", "echo test")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty name")
	})

	t.Run("Empty command", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty command")
	})

	t.Run("Valid command with all fields", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "/usr/bin/echo")
		assert.NoError(t, err)
	})
}
