package utils

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/google/uuid"
)

func TestIsDefaultUUID(t *testing.T) {
	tests := []struct {
		name     string
		uuidStr  string
		expected bool
	}{
		{"Bee-Link default UUID", "03000200-0400-0500-0006-000700080009", true},
		{"All zeros UUID", "00000000-0000-0000-0000-000000000000", true},
		{"All ones UUID", "ffffffff-ffff-ffff-ffff-ffffffffffff", true},
		{"Another common default", "03020100-0504-0706-0809-0a0b0c0d0e0f", true},
		{"Valid random UUID", "550e8400-e29b-41d4-a716-446655440000", false},
		{"Another valid UUID", "6ba7b810-9dad-11d1-80b4-00c04fd430c8", false},
		{"Empty string", "", false},
		{"Uppercase Bee-Link UUID", "03000200-0400-0500-0006-000700080009", true},
		{"Mixed case default UUID", "03000200-0400-0500-0006-000700080009", true},
		{"UUID with spaces", "  03000200-0400-0500-0006-000700080009  ", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsDefaultUUID(tt.uuidStr)
			if result != tt.expected {
				t.Errorf("IsDefaultUUID(%q) = %v, want %v", tt.uuidStr, result, tt.expected)
			}
		})
	}
}

func TestGenerateStableUUID(t *testing.T) {
	tests := []struct {
		name       string
		macAddress string
		hostname   string
	}{
		{"Normal system", "00:11:22:33:44:55", "my-computer"},
		{"Different MAC", "aa:bb:cc:dd:ee:ff", "my-computer"},
		{"Different hostname", "00:11:22:33:44:55", "other-computer"},
		{"Uppercase MAC", "AA:BB:CC:DD:EE:FF", "my-computer"},
		{"Mixed case hostname", "00:11:22:33:44:55", "My-Computer"},
		{"Empty MAC", "", "my-computer"},
		{"Empty hostname", "00:11:22:33:44:55", ""},
		{"Both empty", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Generate UUID
			generatedUUID := GenerateStableUUID(tt.macAddress, tt.hostname)

			// Verify it's a valid UUID
			if _, err := uuid.Parse(generatedUUID); err != nil {
				t.Errorf("GenerateStableUUID generated invalid UUID: %v", err)
			}

			// Verify it's stable (same inputs produce same output)
			generatedUUID2 := GenerateStableUUID(tt.macAddress, tt.hostname)
			if generatedUUID != generatedUUID2 {
				t.Errorf("GenerateStableUUID not stable: first=%s, second=%s", generatedUUID, generatedUUID2)
			}

			// Verify it's not a default UUID
			if IsDefaultUUID(generatedUUID) {
				t.Errorf("GenerateStableUUID produced a default UUID: %s", generatedUUID)
			}
		})
	}
}

func TestGenerateStableUUIDDifferentInputs(t *testing.T) {
	// Verify that different inputs produce different UUIDs
	uuid1 := GenerateStableUUID("00:11:22:33:44:55", "host1")
	uuid2 := GenerateStableUUID("00:11:22:33:44:66", "host1")
	uuid3 := GenerateStableUUID("00:11:22:33:44:55", "host2")

	if uuid1 == uuid2 {
		t.Errorf("Different MAC addresses produced same UUID")
	}
	if uuid1 == uuid3 {
		t.Errorf("Different hostnames produced same UUID")
	}
	if uuid2 == uuid3 {
		t.Errorf("Different inputs produced same UUID")
	}
}

func TestSaveAndLoadUUID(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-uuid-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	// Test saving a UUID
	testUUID := "550e8400-e29b-41d4-a716-446655440000"
	if err := SaveUUID(testUUID); err != nil {
		t.Fatalf("SaveUUID failed: %v", err)
	}

	// Verify the file was created
	uuidPath := filepath.Join(tempDir, "uuid")
	if _, err := os.Stat(uuidPath); os.IsNotExist(err) {
		t.Errorf("UUID file was not created")
	}

	// Test loading the UUID
	loadedUUID, err := LoadOrGenerateUUID("00:11:22:33:44:55", "test-host")
	if err != nil {
		t.Fatalf("LoadOrGenerateUUID failed: %v", err)
	}

	if loadedUUID != testUUID {
		t.Errorf("Loaded UUID = %s, want %s", loadedUUID, testUUID)
	}
}

func TestLoadOrGenerateUUIDWithoutFile(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-uuid-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	macAddress := "00:11:22:33:44:55"
	hostname := "test-host"

	// Load/generate when no file exists
	generatedUUID, err := LoadOrGenerateUUID(macAddress, hostname)
	if err != nil {
		t.Fatalf("LoadOrGenerateUUID failed: %v", err)
	}

	// Verify it's a valid UUID
	if _, err := uuid.Parse(generatedUUID); err != nil {
		t.Errorf("Generated UUID is invalid: %v", err)
	}

	// Verify the file was created
	uuidPath := filepath.Join(tempDir, "uuid")
	if _, err := os.Stat(uuidPath); os.IsNotExist(err) {
		t.Errorf("UUID file was not created after generation")
	}

	// Load again - should get the same UUID from file
	loadedUUID, err := LoadOrGenerateUUID(macAddress, hostname)
	if err != nil {
		t.Fatalf("LoadOrGenerateUUID failed on second call: %v", err)
	}

	if loadedUUID != generatedUUID {
		t.Errorf("Second load returned different UUID: got %s, want %s", loadedUUID, generatedUUID)
	}
}

func TestLoadOrGenerateUUIDWithInvalidStoredUUID(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "system-bridge-uuid-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Set the config directory to our temp directory
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

	macAddress := "00:11:22:33:44:55"
	hostname := "test-host"

	// Ensure the directory exists before writing the file
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	// Save an invalid UUID (a default one)
	uuidPath := filepath.Join(tempDir, "uuid")
	if err := os.WriteFile(uuidPath, []byte("03000200-0400-0500-0006-000700080009"), 0644); err != nil {
		t.Fatalf("Failed to write invalid UUID: %v", err)
	}

	// Load/generate - should detect the default UUID and generate a new one
	generatedUUID, err := LoadOrGenerateUUID(macAddress, hostname)
	if err != nil {
		t.Fatalf("LoadOrGenerateUUID failed: %v", err)
	}

	// Verify it's NOT the default UUID
	if generatedUUID == "03000200-0400-0500-0006-000700080009" {
		t.Errorf("LoadOrGenerateUUID returned the default UUID instead of generating a new one")
	}

	// Verify it's a valid UUID
	if _, err := uuid.Parse(generatedUUID); err != nil {
		t.Errorf("Generated UUID is invalid: %v", err)
	}

	// Verify it's not a default UUID
	if IsDefaultUUID(generatedUUID) {
		t.Errorf("Generated UUID is still a default UUID: %s", generatedUUID)
	}
}

func TestGetSystemUUID(t *testing.T) {
	tests := []struct {
		name       string
		biosUUID   string
		macAddress string
		hostname   string
		wantErr    bool
	}{
		{
			name:       "Valid BIOS UUID",
			biosUUID:   "550e8400-e29b-41d4-a716-446655440000",
			macAddress: "00:11:22:33:44:55",
			hostname:   "test-host",
			wantErr:    false,
		},
		{
			name:       "Default BIOS UUID",
			biosUUID:   "03000200-0400-0500-0006-000700080009",
			macAddress: "00:11:22:33:44:55",
			hostname:   "test-host",
			wantErr:    false,
		},
		{
			name:       "Empty BIOS UUID",
			biosUUID:   "",
			macAddress: "00:11:22:33:44:55",
			hostname:   "test-host",
			wantErr:    false,
		},
		{
			name:       "All zeros BIOS UUID",
			biosUUID:   "00000000-0000-0000-0000-000000000000",
			macAddress: "00:11:22:33:44:55",
			hostname:   "test-host",
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a temporary directory for testing
			tempDir, err := os.MkdirTemp("", "system-bridge-uuid-test-*")
			if err != nil {
				t.Fatalf("Failed to create temp directory: %v", err)
			}
			defer os.RemoveAll(tempDir)

			// Set the config directory to our temp directory
			t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tempDir)

			// Get system UUID
			resultUUID := GetSystemUUID(tt.biosUUID, tt.macAddress, tt.hostname)

			// Verify the result is a valid UUID
			if _, err := uuid.Parse(resultUUID); err != nil {
				t.Errorf("GetSystemUUID returned invalid UUID: %v", err)
			}

			// If BIOS UUID is valid (not default), it should return the BIOS UUID
			if tt.biosUUID != "" && !IsDefaultUUID(tt.biosUUID) {
				if resultUUID != tt.biosUUID {
					t.Errorf("GetSystemUUID with valid BIOS UUID = %s, want %s", resultUUID, tt.biosUUID)
				}
			} else {
				// If BIOS UUID is invalid, it should return a generated UUID
				if IsDefaultUUID(resultUUID) {
					t.Errorf("GetSystemUUID returned a default UUID when BIOS UUID was invalid")
				}

				// Verify stability - calling again should return the same UUID
				resultUUID2 := GetSystemUUID(tt.biosUUID, tt.macAddress, tt.hostname)
				if resultUUID != resultUUID2 {
					t.Errorf("GetSystemUUID not stable across calls: first=%s, second=%s", resultUUID, resultUUID2)
				}
			}
		})
	}
}
