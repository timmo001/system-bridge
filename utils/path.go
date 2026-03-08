package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

const logDirPermissions os.FileMode = 0700

// GetConfigPath returns the path to the config directory
func GetConfigPath() (string, error) {
	var configDirPath string

	switch runtime.GOOS {
	case "windows":
		// First check if user has explicitly set a config path
		if customPath := os.Getenv("SYSTEM_BRIDGE_CONFIG_DIR"); customPath != "" {
			configDirPath = customPath
		} else if appData := os.Getenv("LOCALAPPDATA"); appData != "" {
			configDirPath = filepath.Join(appData, "system-bridge", "v5")
		} else {
			return "", fmt.Errorf("LOCALAPPDATA environment variable not set")
		}
	case "darwin":
		// First check if user has explicitly set a config path
		if customPath := os.Getenv("SYSTEM_BRIDGE_CONFIG_DIR"); customPath != "" {
			configDirPath = customPath
		} else if xdgData := os.Getenv("XDG_DATA_HOME"); xdgData != "" {
			// Support XDG spec on macOS for CLI apps
			configDirPath = filepath.Join(xdgData, "system-bridge", "v5")
		} else if home := os.Getenv("HOME"); home != "" {
			configDirPath = filepath.Join(home, "Library", "Application Support", "system-bridge", "v5")
		} else {
			return "", fmt.Errorf("HOME environment variable not set")
		}
	default:
		// Linux and others: Follow XDG Base Directory Specification
		if customPath := os.Getenv("SYSTEM_BRIDGE_CONFIG_DIR"); customPath != "" {
			configDirPath = customPath
		} else if xdgData := os.Getenv("XDG_DATA_HOME"); xdgData != "" {
			configDirPath = filepath.Join(xdgData, "system-bridge", "v5")
		} else if home := os.Getenv("HOME"); home != "" {
			configDirPath = filepath.Join(home, ".local", "share", "system-bridge", "v5")
		} else {
			return "", fmt.Errorf("HOME environment variable not set")
		}
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
	var logsDirPath string

	switch runtime.GOOS {
	case "windows":
		if customPath := os.Getenv("SYSTEM_BRIDGE_LOG_DIR"); customPath != "" {
			logsDirPath = customPath
		} else if appData := os.Getenv("LOCALAPPDATA"); appData != "" {
			logsDirPath = filepath.Join(appData, "system-bridge", "logs")
		} else {
			return "", fmt.Errorf("LOCALAPPDATA environment variable not set")
		}
	case "darwin":
		if customPath := os.Getenv("SYSTEM_BRIDGE_LOG_DIR"); customPath != "" {
			logsDirPath = customPath
		} else if home := os.Getenv("HOME"); home != "" {
			logsDirPath = filepath.Join(home, "Library", "Logs", "system-bridge")
		} else {
			return "", fmt.Errorf("HOME environment variable not set")
		}
	default:
		if customPath := os.Getenv("SYSTEM_BRIDGE_LOG_DIR"); customPath != "" {
			logsDirPath = customPath
		} else if xdgState := os.Getenv("XDG_STATE_HOME"); xdgState != "" {
			logsDirPath = filepath.Join(xdgState, "system-bridge")
		} else if home := os.Getenv("HOME"); home != "" {
			logsDirPath = filepath.Join(home, ".local", "state", "system-bridge")
		} else {
			return "", fmt.Errorf("HOME environment variable not set")
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
