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
//
// To expand this list: If you encounter systems with duplicate UUIDs, add the
// problematic UUID here with a comment indicating the manufacturer/model.
// Report new defaults at: https://github.com/timmo001/system-bridge/issues
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

	// If both MAC and hostname are empty, we can't generate a stable UUID
	// Fall back to random UUID to avoid all systems getting the same UUID
	if mac == "" && host == "" {
		slog.Warn("Cannot generate stable UUID with empty MAC and hostname, using random UUID")
		return uuid.New().String()
	}

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
// Uses atomic file creation to prevent race conditions when multiple processes start simultaneously
func LoadOrGenerateUUID(macAddress, hostname string) (string, error) {
	uuidPath, err := GetUUIDFilePath()
	if err != nil {
		return "", err
	}

	// Ensure the directory exists
	dir := filepath.Dir(uuidPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create UUID directory: %w", err)
	}

	// Try to create the file exclusively (atomic operation)
	// If successful, we're the first process - write our UUID
	// If it fails with os.ErrExist, another process already created it - read theirs
	file, err := os.OpenFile(uuidPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err == nil {
		// We created the file successfully, write our UUID
		generatedUUID := GenerateStableUUID(macAddress, hostname)
		_, writeErr := file.WriteString(generatedUUID)
		closeErr := file.Close()
		if writeErr != nil {
			return "", fmt.Errorf("failed to write UUID to new file: %w", writeErr)
		}
		if closeErr != nil {
			return "", fmt.Errorf("failed to close UUID file: %w", closeErr)
		}
		slog.Info("Generated and saved new stable UUID", "uuid", generatedUUID)
		return generatedUUID, nil
	} else if !os.IsExist(err) {
		// Some other error occurred (not "file already exists")
		return "", fmt.Errorf("failed to create UUID file: %w", err)
	}

	// File already exists, read it with retry logic
	// Another process may have just created it and might still be writing
	storedUUID, err := readUUIDWithRetry(uuidPath, macAddress, hostname)
	if err != nil {
		return "", err
	}

	// Validate the stored UUID
	if storedUUID == "" {
		slog.Warn("Stored UUID is empty after retries, regenerating")
		return regenerateUUID(uuidPath, macAddress, hostname)
	}

	if IsDefaultUUID(storedUUID) {
		slog.Warn("Stored UUID is a default value, regenerating", "uuid", storedUUID)
		return regenerateUUID(uuidPath, macAddress, hostname)
	}

	if _, err := uuid.Parse(storedUUID); err != nil {
		slog.Warn("Stored UUID has invalid format, regenerating", "error", err)
		return regenerateUUID(uuidPath, macAddress, hostname)
	}

	return storedUUID, nil
}

// readUUIDWithRetry reads the UUID file with retry logic and exponential backoff
// This handles the race condition where another process created the file but hasn't finished writing
func readUUIDWithRetry(uuidPath, macAddress, hostname string) (string, error) {
	const maxRetries = 5
	const baseDelay = 10 * time.Millisecond

	var storedUUID string
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms
			delay := baseDelay * time.Duration(1<<uint(attempt-1))
			slog.Debug("Retrying UUID file read", "attempt", attempt+1, "delay", delay)
			time.Sleep(delay)
		}

		uuidBytes, err := os.ReadFile(uuidPath)
		if err != nil {
			// If the file was deleted between our check and read, that's unusual
			// but we should handle it by returning an error
			if os.IsNotExist(err) && attempt == maxRetries-1 {
				return "", fmt.Errorf("UUID file disappeared during read attempts: %w", err)
			} else if os.IsNotExist(err) {
				continue // Retry
			}
			return "", fmt.Errorf("failed to read UUID file on attempt %d: %w", attempt+1, err)
		}

		storedUUID = strings.TrimSpace(string(uuidBytes))

		// If we got a non-empty UUID, we're done
		if storedUUID != "" {
			if attempt > 0 {
				slog.Debug("Successfully read UUID after retry", "attempt", attempt+1)
			}
			break
		}

		// Empty UUID - another process might still be writing
		if attempt == maxRetries-1 {
			// Last attempt and still empty - this is a problem
			slog.Warn("UUID file is empty after all retry attempts", "attempts", maxRetries)
		}
	}

	return storedUUID, nil
}

// regenerateUUID replaces an invalid UUID file with a new valid one
func regenerateUUID(uuidPath, macAddress, hostname string) (string, error) {
	generatedUUID := GenerateStableUUID(macAddress, hostname)
	if err := os.WriteFile(uuidPath, []byte(generatedUUID), 0600); err != nil {
		slog.Warn("Failed to save regenerated UUID", "error", err)
		// Return the generated UUID anyway, even if we couldn't save it
		return generatedUUID, nil
	}
	slog.Info("Regenerated and saved stable UUID", "uuid", generatedUUID)
	return generatedUUID, nil
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

	// Write UUID to file with restricted permissions (owner read/write only)
	if err := os.WriteFile(uuidPath, []byte(uuidStr), 0600); err != nil {
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
		slog.Warn("System UUID is empty, generating stable UUID based on MAC address and hostname")
	} else {
		slog.Warn(
			"System has default BIOS UUID (manufacturer did not customize). Using stable generated UUID instead.",
			"biosUUID", biosUUID,
			"recommendation", "Update BIOS settings if possible to set a unique UUID",
		)
	}

	// Try to load or generate a stable UUID
	generatedUUID, err := LoadOrGenerateUUID(macAddress, hostname)
	if err != nil {
		slog.Error("Failed to load or generate UUID from file", "error", err)
		// Last resort: generate a stable UUID directly (won't be persisted, but at least it's deterministic)
		fallbackUUID := GenerateStableUUID(macAddress, hostname)
		slog.Warn("Using stable UUID without file persistence", "uuid", fallbackUUID)
		return fallbackUUID
	}

	return generatedUUID
}
