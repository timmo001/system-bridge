package utils

import (
	"fmt"
	"os"
)

// GetConfigPath returns the path to the config directory
func GetConfigPath() (string, error) {
	configDirPath := ""
	if os.Getenv("XDG_CONFIG_HOME") != "" {
		configDirPath = os.Getenv("XDG_CONFIG_HOME") + "/system-bridge/v5"
	} else if os.Getenv("APPDATA") != "" {
		configDirPath = os.Getenv("APPDATA") + "/system-bridge/v5"
	} else if os.Getenv("HOME") != "" {
		configDirPath = os.Getenv("HOME") + "/.config/system-bridge/v5"
	} else {
		return "", fmt.Errorf("could not determine config path")
	}

	// Create the config directory if it doesn't exist
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
	dataPath := configPath + "/data"
	
	// Create the data directory if it doesn't exist
	if err := os.MkdirAll(dataPath, 0755); err != nil {
		return "", fmt.Errorf("could not create data directory: %w", err)
	}

	return dataPath, nil
} 