package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/google/uuid"
)

func GenerateToken() string {
	return uuid.New().String()
}

// GetTokenFilePath returns the path to the token file
func GetTokenFilePath() (string, error) {
	configDirPath, err := GetConfigPath()
	if err != nil {
		return "", fmt.Errorf("could not get config path: %w", err)
	}
	return filepath.Join(configDirPath, "token"), nil
}

// LoadToken loads the API token from file, generating one if it doesn't exist
func LoadToken() (string, error) {
	tokenPath, err := GetTokenFilePath()
	if err != nil {
		return "", err
	}

	// Check if token file exists
	if _, err := os.Stat(tokenPath); os.IsNotExist(err) {
		// Generate new token and save it
		token := GenerateToken()
		if err := SaveToken(token); err != nil {
			return "", fmt.Errorf("failed to save new token: %w", err)
		}
		log.Info("Generated new API token")
		return token, nil
	}

	// Read existing token
	tokenBytes, err := os.ReadFile(tokenPath)
	if err != nil {
		return "", fmt.Errorf("failed to read token file: %w", err)
	}

	token := strings.TrimSpace(string(tokenBytes))
	if token == "" {
		// Token file is empty, generate new one
		token = GenerateToken()
		if err := SaveToken(token); err != nil {
			return "", fmt.Errorf("failed to save new token: %w", err)
		}
		log.Info("Generated new API token (file was empty)")
		return token, nil
	}

	return token, nil
}

// SaveToken saves the API token to file
func SaveToken(token string) error {
	tokenPath, err := GetTokenFilePath()
	if err != nil {
		return err
	}

	// Ensure the directory exists
	dir := filepath.Dir(tokenPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create token directory: %w", err)
	}

	// Write token to file with restricted permissions
	if err := os.WriteFile(tokenPath, []byte(token), 0600); err != nil {
		return fmt.Errorf("failed to write token file: %w", err)
	}

	return nil
}

// GetPort returns the port from environment variable, defaulting to 9170
func GetPort() int {
	portStr := os.Getenv("SYSTEM_BRIDGE_PORT")
	if portStr == "" {
		return 9170
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		log.Warnf("Invalid port in SYSTEM_BRIDGE_PORT environment variable: %s, using default 9170", portStr)
		return 9170
	}

	if port < 1 || port > 65535 {
		log.Warnf("Port %d is out of valid range (1-65535), using default 9170", port)
		return 9170
	}

	return port
}
