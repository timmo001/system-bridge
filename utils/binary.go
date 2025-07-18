package utils

import (
	"os"
	"path/filepath"
	"strings"
)

// IsRunningFromRealBinary checks if the application is running from a real binary
// rather than from go run or wgo run
func IsRunningFromRealBinary() bool {
	executablePath := os.Args[0]

	// Check if the executable path contains "go" or "wgo" which indicates development mode
	if strings.Contains(executablePath, "go") {
		// Additional check: if the executable name is "go" or "wgo", we're in development mode
		executableName := filepath.Base(executablePath)
		if executableName == "go" || executableName == "wgo" {
			return false
		}
	}

	// Check if we're running from a temporary directory (common with go run)
	if strings.Contains(executablePath, "go-build") || strings.Contains(executablePath, "tmp") {
		return false
	}

	return true
}
