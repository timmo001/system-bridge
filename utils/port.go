package utils

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
)

// GetPort returns the port from environment variable, defaulting to 9170
func GetPort() int {
	portStr := os.Getenv("SYSTEM_BRIDGE_PORT")
	if portStr == "" {
		return 9170
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		slog.Warn(fmt.Sprintf("Invalid port in SYSTEM_BRIDGE_PORT environment variable: %s, using default 9170", portStr))
		return 9170
	}

	if port < 1 || port > 65535 {
		slog.Warn(fmt.Sprintf("Port %d is out of valid range (1-65535), using default 9170", port))
		return 9170
	}

	return port
}

// GetSSDPPort returns the SSDP port from environment variable, defaulting to 1900
func GetSSDPPort() int {
	portStr := os.Getenv("SYSTEM_BRIDGE_SSDP_PORT")
	if portStr == "" {
		return 1900
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		slog.Warn(fmt.Sprintf("Invalid port in SYSTEM_BRIDGE_SSDP_PORT environment variable: %s, using default 1900", portStr))
		return 1900
	}

	if port < 1 || port > 65535 {
		slog.Warn(fmt.Sprintf("Port %d is out of valid range (1-65535), using default 1900", port))
		return 1900
	}

	return port
}
