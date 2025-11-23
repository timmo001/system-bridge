package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"slices"
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

// ValidateCommand validates a command definition
func ValidateCommand(id, name, command, workingDir string, arguments []string) error {
	if id == "" {
		return fmt.Errorf("command has empty ID")
	}
	if name == "" {
		return fmt.Errorf("command %s has empty name", id)
	}
	if command == "" {
		return fmt.Errorf("command %s has empty command", id)
	}

	// Clean the command path to resolve any '..' or '.' components
	// This prevents path traversal attacks (e.g., /usr/bin/../../../etc/passwd)
	command = filepath.Clean(command)

	// Validate command path is absolute
	if !filepath.IsAbs(command) {
		return fmt.Errorf("command %s must use absolute path", id)
	}

	// Validate command file exists and is executable
	fileInfo, err := os.Stat(command)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("command %s not found at path: %s", id, command)
		}
		return fmt.Errorf("command %s path error: %w", id, err)
	}

	// Validate file is regular
	mode := fileInfo.Mode()
	if !mode.IsRegular() {
		return fmt.Errorf("command %s is not a regular file", id)
	}

	// Check executable permissions - different logic for Unix vs Windows
	if runtime.GOOS != "windows" {
		// On Unix-like systems, check executable bit (0111 = owner, group, others execute permissions)
		if mode&0111 == 0 {
			return fmt.Errorf("command %s is not executable (missing execute permissions)", id)
		}
	} else {
		// On Windows, executable permission is determined by file extension
		ext := strings.ToLower(filepath.Ext(command))
		validExts := []string{".exe", ".bat", ".cmd", ".ps1"}
		if !slices.Contains(validExts, ext) {
			return fmt.Errorf("command %s must have executable extension (.exe, .bat, .cmd, .ps1) on Windows", id)
		}
	}

	// Validate working directory if specified
	if workingDir != "" {
		// Check for '..' before cleaning the path (filepath.Clean normalizes and removes '..')
		if strings.Contains(workingDir, "..") {
			return fmt.Errorf("working directory for command %s contains '..' which is not allowed", id)
		}

		// Clean the working directory path to resolve any '.' components
		workingDir = filepath.Clean(workingDir)

		if !filepath.IsAbs(workingDir) {
			return fmt.Errorf("working directory for command %s must be absolute path", id)
		}

		info, err := os.Stat(workingDir)
		if err != nil {
			if os.IsNotExist(err) {
				return fmt.Errorf("working directory for command %s does not exist: %s", id, workingDir)
			}
			return fmt.Errorf("working directory for command %s: %w", id, err)
		}
		if !info.IsDir() {
			return fmt.Errorf("working directory for command %s is not a directory: %s", id, workingDir)
		}
	}

	// Validate arguments don't contain shell metacharacters
	// Check for: ; | & $ \n \r ` < > ( )
	for _, arg := range arguments {
		if strings.ContainsAny(arg, ";|&$\n\r`<>()") {
			return fmt.Errorf("argument for command %s contains forbidden characters (shell metacharacters not allowed)", id)
		}
	}

	return nil
}
