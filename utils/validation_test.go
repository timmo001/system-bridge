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
		err = tempFile.Close()
		require.NoError(t, err)
		defer func() {
			err := os.Remove(tempFilePath)
			if err != nil {
				t.Fatalf("failed to remove temp file: %v", err)
			}
		}()

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
		err := ValidateCommand("test-cmd", "Test Command", "/bin/echo", "", nil)
		assert.NoError(t, err)
	})

	t.Run("Empty ID", func(t *testing.T) {
		err := ValidateCommand("", "Test Command", "/bin/echo", "", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty ID")
	})

	t.Run("Empty name", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "", "/bin/echo", "", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty name")
	})

	t.Run("Empty command", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "", "", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "empty command")
	})

	t.Run("Relative path not allowed", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "echo", "", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must use absolute path")
	})

	t.Run("Non-existent command file", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "/non/existent/command", "", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not found at path")
	})

	t.Run("Valid command with working directory", func(t *testing.T) {
		// Create a temporary directory for working dir
		tempDir, err := os.MkdirTemp("", "command-test-*")
		require.NoError(t, err)
		defer func() {
			err := os.RemoveAll(tempDir)
			if err != nil {
				t.Fatalf("failed to remove temp dir: %v", err)
			}
		}()

		err = ValidateCommand("test-cmd", "Test Command", "/bin/echo", tempDir, nil)
		assert.NoError(t, err)
	})

	t.Run("Relative working directory not allowed", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "/bin/echo", "relative/path", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must be absolute path")
	})

	t.Run("Non-existent working directory", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "/bin/echo", "/non/existent/dir", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "does not exist")
	})

	t.Run("Working directory with '..'", func(t *testing.T) {
		err := ValidateCommand("test-cmd", "Test Command", "/bin/echo", "/some/path/../other", nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "'..'")
	})

	t.Run("Arguments with shell metacharacters", func(t *testing.T) {
		args := []string{"arg1", "arg2; rm -rf /", "arg3"}
		err := ValidateCommand("test-cmd", "Test Command", "/bin/echo", "", args)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "forbidden characters")
	})

	t.Run("Valid command with safe arguments", func(t *testing.T) {
		args := []string{"--help", "-v", "test.txt"}
		err := ValidateCommand("test-cmd", "Test Command", "/bin/echo", "", args)
		assert.NoError(t, err)
	})
}
