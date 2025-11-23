package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ValidateMediaDirectory validates a single media directory path
func ValidateMediaDirectory(path string) error {
	// Check for '..' before cleaning the path (filepath.Clean normalizes and removes '..')
	if strings.Contains(path, "..") {
		return fmt.Errorf("media directory path contains '..' which is not allowed: %s", path)
	}

	cleanPath := filepath.Clean(path)
	stat, err := os.Stat(cleanPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("media directory does not exist: %s", path)
		}
		return fmt.Errorf("error accessing media directory %s: %w", path, err)
	}

	if !stat.IsDir() {
		return fmt.Errorf("media directory path is not a directory: %s", path)
	}

	return nil
}

// ValidateCommand validates a command definition by its fields
func ValidateCommand(id, name, command string) error {
	if id == "" {
		return fmt.Errorf("command has empty ID")
	}
	if name == "" {
		return fmt.Errorf("command %s has empty name", id)
	}
	if command == "" {
		return fmt.Errorf("command %s has empty command", id)
	}
	return nil
}
