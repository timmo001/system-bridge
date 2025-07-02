# System Bridge - Core Component Tests

This document provides a summary of the comprehensive test suite created for the core components of the System Bridge Go application.

## Overview

The test suite focuses on testing the most critical and highly depended upon components of the application. These tests ensure the reliability and correctness of the core functionality that other parts of the application depend on.

## Test Coverage

### 1. Settings Management (`settings/settings_test.go`)

**Purpose**: Tests the configuration management system that handles application settings.

**Test Cases**:
- **Load functionality**:
  - Loading with default values when config file doesn't exist
  - Loading existing config file with custom values
  - Handling invalid config file gracefully
- **Save functionality**:
  - Saving settings successfully and verifying persistence
- **Data structures**:
  - Testing all settings structs (SettingsHotkey, SettingsMediaDirectory, SettingsMedia, Settings)

**Key Features Tested**:
- Viper configuration management
- JSON serialization/deserialization
- Default value handling
- Error handling for malformed configs
- File system interactions

### 2. Token Management (`utils/token_test.go`)

**Purpose**: Tests the API token management system critical for application security.

**Test Cases**:
- **Token generation**:
  - Valid UUID token generation
  - Uniqueness of generated tokens
- **Token file operations**:
  - Getting token file path
  - Loading tokens (new generation, existing, empty file, whitespace handling)
  - Saving tokens with proper permissions
- **Port management**:
  - Default port handling
  - Environment variable parsing
  - Input validation and error handling
- **Integration workflows**:
  - Complete token lifecycle management

**Key Features Tested**:
- UUID generation and validation
- File system operations with proper permissions (0600)
- Environment variable handling
- Error handling for invalid inputs
- Token persistence and retrieval

### 3. Path Utilities (`utils/path_test.go`)

**Purpose**: Tests the cross-platform path management system.

**Test Cases**:
- **Config path management**:
  - Custom environment variable handling
  - Platform-specific defaults (Windows, macOS, Linux)
  - XDG Base Directory Specification support
  - Error handling for missing environment variables
  - Directory creation and permissions
- **Data path management**:
  - Data directory creation and management
  - Path cleaning and validation
- **Integration tests**:
  - Config and data paths working together
  - Permission verification

**Key Features Tested**:
- Cross-platform compatibility
- Environment variable precedence
- Directory creation with proper permissions (0755)
- Path validation and cleaning
- Error handling for invalid configurations

### 4. Data Store (`data/data_test.go`)

**Purpose**: Tests the central data management system that handles all system data modules.

**Test Cases**:
- **Data store initialization**:
  - Creating new data store with all default modules
- **Module registration**:
  - Registering new modules
  - Multiple module registration
- **Module data operations**:
  - Getting modules with and without data
  - Setting module data with timestamp tracking
  - Error handling for non-existent modules
- **Data retrieval**:
  - Getting all registered modules
  - Getting all module data
- **Concurrency**:
  - Concurrent register and get operations
- **Lifecycle management**:
  - Complete module lifecycle from registration to data updates

**Key Features Tested**:
- Thread-safe operations with mutex protection
- Module registration and management
- Data persistence and retrieval
- Timestamp tracking for data updates
- Event bus integration for data updates
- Concurrent access patterns

### 5. Event System (`event/event_test.go`)

**Purpose**: Tests the message routing and event handling system.

**Test Cases**:
- **Message structures**:
  - Message and MessageResponse creation
  - Error response handling
- **Message router**:
  - Handler registration (simple and complex)
  - Handler replacement
  - Message handling with registered/unregistered events
  - Multiple event type handling
- **Event types**:
  - Verification of all event type constants
- **Integration**:
  - Complete message handling workflow with complex data processing

**Key Features Tested**:
- Event type and response type constants
- Message routing and handler management
- Error handling for unknown events
- Complex data processing in handlers
- Integration with module system

### 6. Event Bus (`bus/bus_test.go`)

**Purpose**: Tests the central event bus system for inter-component communication.

**Test Cases**:
- **Event bus creation**:
  - New event bus initialization
- **Subscription management**:
  - Single and multiple subscriber registration
  - Subscriber replacement and cleanup
  - Unsubscription with proper cleanup
- **Event publishing**:
  - Single and multiple subscriber notification
  - Different event type handling
  - No subscriber scenarios
- **Concurrency**:
  - Concurrent subscribe and publish operations
- **Singleton pattern**:
  - Singleton instance management and functionality

**Key Features Tested**:
- Thread-safe event subscription and publishing
- Proper subscriber management and cleanup
- Concurrent event handling
- Singleton pattern implementation
- Event delivery to multiple subscribers
- Goroutine-based asynchronous event delivery

## Test Infrastructure

### Dependencies
- **testify**: Used for assertions and test utilities
  - `assert`: For standard assertions
  - `require`: For assertions that should stop test execution on failure
- **Standard library**: `os`, `path/filepath`, `testing`, `time`, `sync`

### Test Patterns
- **Table-driven tests**: Used where appropriate for testing multiple scenarios
- **Subtests**: Organized using `t.Run()` for better test organization and reporting
- **Temporary directories**: Tests use `os.MkdirTemp()` for isolated file system operations
- **Environment isolation**: Tests use `t.Setenv()` to avoid environment variable conflicts
- **Concurrency testing**: Uses goroutines, channels, and `sync.WaitGroup` for testing concurrent operations
- **Mock implementations**: Custom mock types for testing interfaces (e.g., `mockUpdater`)

### Test Quality Features
- **Cleanup**: Proper cleanup of temporary files and directories
- **Error handling**: Comprehensive error scenario testing
- **Edge cases**: Testing boundary conditions and invalid inputs
- **Integration**: End-to-end workflow testing
- **Concurrency**: Thread safety verification
- **Cross-platform**: Platform-specific behavior testing

## Running the Tests

```bash
# Run all core component tests
go test ./settings ./utils ./data ./event ./bus -v

# Run tests for a specific package
go test ./settings -v
go test ./utils -v
go test ./data -v
go test ./event -v
go test ./bus -v

# Run with coverage
go test ./settings ./utils ./data ./event ./bus -cover
```

## Test Results

All tests pass successfully, providing confidence in the core functionality of the System Bridge application. The test suite covers:

- **Settings management**: Configuration loading, saving, and validation
- **Security**: Token generation, storage, and retrieval
- **File system**: Cross-platform path management and directory operations
- **Data management**: Module registration, data storage, and retrieval
- **Event handling**: Message routing and event processing
- **Inter-component communication**: Event bus for system-wide messaging

These tests ensure that the foundational components of the System Bridge application are robust, reliable, and ready for production use.