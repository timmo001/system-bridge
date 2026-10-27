package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/adrg/xdg"
)

const logDirPermissions os.FileMode = 0700

// GetConfigPath returns the path to the config directory: in the user's data
// directory, such as ~/.local/share on Linux, ~/Library/Application Support
// on macOS and LocalAppData on Windows, unless SYSTEM_BRIDGE_CONFIG_DIR sets
// one
func GetConfigPath() (string, error) {
	configDirPath := os.Getenv("SYSTEM_BRIDGE_CONFIG_DIR")
	if configDirPath == "" {
		configDirPath = filepath.Join(xdg.DataHome, "system-bridge", "v5")
	}

	// Ensure the path is absolute
	if !filepath.IsAbs(configDirPath) {
		return "", fmt.Errorf("config directory path must be absolute")
	}

	// Clean the path and create the config directory if it doesn't exist
	configDirPath = filepath.Clean(configDirPath)
	if err := os.MkdirAll(configDirPath, 0755); err != nil {
		return "", fmt.Errorf("could not create config directory: %w", err)
	}

	return configDirPath, nil
}

// GetDataPath returns the path to the data directory
func GetDataPath() (string, error) {
	configPath, err := GetConfigPath()
	if err != nil {
		return "", err
	}

	dataPath := filepath.Join(configPath, "data")
	dataPath = filepath.Clean(dataPath)

	// Create the data directory if it doesn't exist
	if err := os.MkdirAll(dataPath, 0755); err != nil {
		return "", fmt.Errorf("could not create data directory: %w", err)
	}

	return dataPath, nil
}

// GetLogsPath returns the path to the logs directory.
func GetLogsPath() (string, error) {
	logsDirPath := os.Getenv("SYSTEM_BRIDGE_LOG_DIR")
	if logsDirPath == "" {
		switch runtime.GOOS {
		case "windows":
			logsDirPath = filepath.Join(xdg.StateHome, "system-bridge", "logs")
		case "darwin":
			// xdg's state directory on macOS is Application Support, but
			// logs belong in Library/Logs
			logsDirPath = filepath.Join(xdg.Home, "Library", "Logs", "system-bridge")
		default:
			logsDirPath = filepath.Join(xdg.StateHome, "system-bridge")
		}
	}

	if !filepath.IsAbs(logsDirPath) {
		return "", fmt.Errorf("logs directory path must be absolute")
	}

	logsDirPath = filepath.Clean(logsDirPath)
	if err := os.MkdirAll(logsDirPath, logDirPermissions); err != nil {
		return "", fmt.Errorf("could not create logs directory: %w", err)
	}
	if err := os.Chmod(logsDirPath, logDirPermissions); err != nil {
		return "", fmt.Errorf("could not set logs directory permissions: %w", err)
	}

	return logsDirPath, nil
}

// GetLogFilePath returns the path to the daily log file.
func GetLogFilePath(now time.Time) (string, error) {
	logsPath, err := GetLogsPath()
	if err != nil {
		return "", err
	}

	return filepath.Join(logsPath, now.Format("2006-01-02")+".log"), nil
}
