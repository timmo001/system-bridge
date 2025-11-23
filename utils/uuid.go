package utils

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"log/slog"

	"github.com/google/uuid"
)

// List of known problematic default UUIDs that manufacturers fail to update
// These are common default values in various BIOS/Chipsets
var defaultUUIDs = map[string]bool{
	"03000200-0400-0500-0006-000700080009": true, // Common Bee-Link and other manufacturers
	"00000000-0000-0000-0000-000000000000": true, // All zeros
	"ffffffff-ffff-ffff-ffff-ffffffffffff": true, // All ones
	"03020100-0504-0706-0809-0a0b0c0d0e0f": true, // Another common default
}

// IsDefaultUUID checks if the given UUID is a known problematic default value
func IsDefaultUUID(uuidStr string) bool {
	normalized := strings.ToLower(strings.TrimSpace(uuidStr))
	return defaultUUIDs[normalized]
}

// GetUUIDFilePath returns the path to the generated UUID file
func GetUUIDFilePath() (string, error) {
	configDirPath, err := GetConfigPath()
	if err != nil {
		return "", fmt.Errorf("could not get config path: %w", err)
	}
	return filepath.Join(configDirPath, "uuid"), nil
}

// GenerateStableUUID creates a stable UUID based on system characteristics
// This ensures the same UUID is generated for the same system even if not persisted
func GenerateStableUUID(macAddress, hostname string) string {
	// Normalize inputs
	mac := strings.ToLower(strings.TrimSpace(macAddress))
	host := strings.ToLower(strings.TrimSpace(hostname))

	// Create a deterministic seed from MAC address and hostname
	seed := fmt.Sprintf("system-bridge-%s-%s", mac, host)

	// Generate a SHA-256 hash of the seed
	hash := sha256.Sum256([]byte(seed))

	// Use the first 16 bytes of the hash to create a UUID
	// This creates a valid UUID v4 format
	var uuidBytes [16]byte
	copy(uuidBytes[:], hash[:16])

	// Set version (4) and variant bits according to RFC 4122
	uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x40 // Version 4
	uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80 // Variant 10

	generatedUUID, err := uuid.FromBytes(uuidBytes[:])
	if err != nil {
		// Fallback to random UUID if something goes wrong
		slog.Warn("Failed to create UUID from bytes, generating random UUID", "error", err)
		return uuid.New().String()
	}

	return generatedUUID.String()
}

// LoadOrGenerateUUID loads a previously generated UUID from file, or generates a new one
func LoadOrGenerateUUID(macAddress, hostname string) (string, error) {
	uuidPath, err := GetUUIDFilePath()
	if err != nil {
		return "", err
	}

	// Check if UUID file exists
	if _, err := os.Stat(uuidPath); os.IsNotExist(err) {
		// Generate new stable UUID and save it
		generatedUUID := GenerateStableUUID(macAddress, hostname)
		if err := SaveUUID(generatedUUID); err != nil {
			slog.Warn("Failed to save generated UUID, using it anyway", "error", err)
		} else {
			slog.Info("Generated and saved new stable UUID", "uuid", generatedUUID)
		}
		return generatedUUID, nil
	}

	// Read existing UUID
	uuidBytes, err := os.ReadFile(uuidPath)
	if err != nil {
		// If we can't read it, generate a new one
		slog.Warn("Failed to read UUID file, generating new one", "error", err)
		generatedUUID := GenerateStableUUID(macAddress, hostname)
		if saveErr := SaveUUID(generatedUUID); saveErr != nil {
			slog.Warn("Failed to save generated UUID", "error", saveErr)
		}
		return generatedUUID, nil
	}

	storedUUID := strings.TrimSpace(string(uuidBytes))
	if storedUUID == "" || IsDefaultUUID(storedUUID) {
		// Stored UUID is invalid, regenerate
		slog.Info("Stored UUID is invalid or empty, generating new one")
		generatedUUID := GenerateStableUUID(macAddress, hostname)
		if saveErr := SaveUUID(generatedUUID); saveErr != nil {
			slog.Warn("Failed to save generated UUID", "error", saveErr)
		}
		return generatedUUID, nil
	}

	// Validate the stored UUID format
	if _, err := uuid.Parse(storedUUID); err != nil {
		slog.Warn("Stored UUID has invalid format, generating new one", "error", err)
		generatedUUID := GenerateStableUUID(macAddress, hostname)
		if saveErr := SaveUUID(generatedUUID); saveErr != nil {
			slog.Warn("Failed to save generated UUID", "error", saveErr)
		}
		return generatedUUID, nil
	}

	return storedUUID, nil
}

// SaveUUID saves the UUID to file
func SaveUUID(uuidStr string) error {
	uuidPath, err := GetUUIDFilePath()
	if err != nil {
		return err
	}

	// Ensure the directory exists
	dir := filepath.Dir(uuidPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create UUID directory: %w", err)
	}

	// Write UUID to file
	if err := os.WriteFile(uuidPath, []byte(uuidStr), 0644); err != nil {
		return fmt.Errorf("failed to write UUID file: %w", err)
	}

	return nil
}

// GetSystemUUID gets the system UUID, using fallback logic for problematic default UUIDs
// biosUUID: The UUID read from BIOS/system
// macAddress: The system's MAC address (used for generating stable fallback)
// hostname: The system's hostname (used for generating stable fallback)
func GetSystemUUID(biosUUID, macAddress, hostname string) string {
	// Normalize the BIOS UUID
	normalizedBiosUUID := strings.ToLower(strings.TrimSpace(biosUUID))

	// Check if the BIOS UUID is valid (not empty and not a default value)
	if normalizedBiosUUID != "" && !IsDefaultUUID(normalizedBiosUUID) {
		// BIOS UUID is valid, use it
		return biosUUID
	}

	// BIOS UUID is problematic, need to use or generate an alternative
	if normalizedBiosUUID == "" {
		slog.Warn("System UUID is empty, generating stable UUID")
	} else {
		slog.Warn("System UUID is a known default value, generating stable UUID", "biosUUID", biosUUID)
	}

	// Try to load or generate a stable UUID
	generatedUUID, err := LoadOrGenerateUUID(macAddress, hostname)
	if err != nil {
		slog.Error("Failed to load or generate UUID", "error", err)
		// Last resort: generate a random UUID (not stable across reboots)
		fallbackUUID := uuid.New().String()
		slog.Warn("Using random UUID as last resort", "uuid", fallbackUUID)
		return fallbackUUID
	}

	return generatedUUID
}
