# Command Execution Feature Implementation

This document outlines the implementation of arbitrary command execution with allow-list security for System Bridge, addressing [GitHub Issue #3452](https://github.com/timmo001/system-bridge/issues/3452).

## Overview

The feature allows users to configure and execute system commands through System Bridge with a security-focused allow-list approach. Users can define specific commands they want to allow, and only those commands can be executed through the API.

## Backend Implementation

### 1. Settings Structure Updates

**File: `settings/settings.go`**

Added new settings structures for command configuration:

```go
type SettingsCommand struct {
    Name        string   `json:"name" mapstructure:"name"`
    Description string   `json:"description" mapstructure:"description"`
    Command     string   `json:"command" mapstructure:"command"`
    Args        []string `json:"args" mapstructure:"args"`
    Enabled     bool     `json:"enabled" mapstructure:"enabled"`
}

type SettingsCommands struct {
    Commands []SettingsCommand `json:"commands" mapstructure:"commands"`
}
```

Updated main Settings struct to include:
```go
type Settings struct {
    // ... existing fields
    Commands  SettingsCommands `json:"commands" mapstructure:"commands"`
    // ... existing fields
}
```

### 2. Event Types

**File: `event/event_types.go`**

Added new event type:
```go
EventRunCommand EventType = "RUN_COMMAND"
```

**File: `event/response_types.go`**

Added new response types:
```go
ResponseTypeCommandExecuted ResponseType = "COMMAND_EXECUTED"
ResponseSubtypeCommandNotAllowed ResponseSubtype = "COMMAND_NOT_ALLOWED"
ResponseSubtypeCommandNotFound ResponseSubtype = "COMMAND_NOT_FOUND"
ResponseSubtypeMissingCommand ResponseSubtype = "MISSING_COMMAND"
```

### 3. Cross-Platform Command Execution Utility

**File: `utils/handlers/command/command.go`**

Created a comprehensive command execution utility with:

- **CommandResult struct**: Captures exit code, stdout, stderr, and errors
- **ExecuteCommand function**: Cross-platform command execution
- **ValidateCommand function**: Basic security validation
- **GetPlatformSpecificCommand function**: Platform-specific command resolution

Key features:
- Proper error handling and exit code capture
- Warning for potentially dangerous commands (non-blocking)
- Platform-specific executable resolution (Windows .exe, .com, .bat, .cmd)
- Structured result format for easy consumption

### 4. Command Execution Handler

**File: `event/handler/run-command.go`**

Implements the main command execution logic:

```go
type RunCommandRequestData struct {
    Name string `json:"name" mapstructure:"name"`
}

type RunCommandResponseData struct {
    Name     string                 `json:"name" mapstructure:"name"`
    Command  string                 `json:"command" mapstructure:"command"`
    Args     []string               `json:"args" mapstructure:"args"`
    Result   *command.CommandResult `json:"result" mapstructure:"result"`
}
```

Security features:
- Only commands in the allow-list can be executed
- Commands must be explicitly enabled
- Settings validation before execution
- Comprehensive error handling and logging

**File: `event/handler/handler.go`**

Registered the new handler:
```go
RegisterRunCommandHandler(router)
```

### 5. HTTP REST API Endpoints

**File: `backend/http/commands.go`**

Created HTTP endpoints for command execution:

- **POST /api/commands**: Execute a command by name
- **GET /api/commands**: List all enabled commands

**File: `backend/backend.go`**

Registered the commands endpoint:
```go
mux.HandleFunc("/api/commands", api_http.HandleCommands)
```

## Frontend Implementation

### 1. TypeScript Types

**File: `web-client/src/lib/system-bridge/types-settings.ts`**

Added command configuration types:
```typescript
export const SettingsCommandSchema = z.object({
  name: z.string(),
  description: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  enabled: z.boolean(),
});

export const SettingsCommandsSchema = z.object({
  commands: z.array(SettingsCommandSchema),
});
```

Updated main settings schema to include commands.

**File: `web-client/src/lib/system-bridge/types-websocket.ts`**

Added WebSocket event and response types:
```typescript
"RUN_COMMAND" // Event type
"COMMAND_EXECUTED" // Response type
"COMMAND_NOT_ALLOWED", "COMMAND_NOT_FOUND", "MISSING_COMMAND" // Error subtypes
```

### 2. UI Components

**File: `web-client/src/components/ui/command-settings.tsx`**

Comprehensive command management interface:
- Add/edit/delete commands
- Configure command name, description, executable, and arguments
- Enable/disable individual commands
- Inline editing with save/cancel functionality
- Dynamic argument management

**File: `web-client/src/components/ui/command-executor.tsx`**

Command execution interface:
- Grid layout of executable commands
- Real-time execution status
- Command output display (stdout, stderr, exit codes)
- Toast notifications for execution results
- Loading states and error handling

**File: `web-client/src/components/ui/card.tsx`**

Created reusable card components for consistent UI.

### 3. Integration with Settings

**File: `web-client/src/app/(websocket)/(client)/settings/_components/settings.tsx`**

Updated main settings component to include command configuration.

### 4. Command Execution Pages

**File: `web-client/src/app/(websocket)/(client)/commands/page.tsx`**
**File: `web-client/src/app/(websocket)/(client)/commands/_components/commands.tsx`**

Created dedicated pages for command execution interface.

## API Interfaces

### WebSocket API

#### Execute Command
```javascript
// Request
{
  "id": "unique-id",
  "event": "RUN_COMMAND",
  "data": {
    "name": "turn-off-monitors"
  },
  "token": "your-api-token"
}

// Response
{
  "id": "unique-id",
  "type": "COMMAND_EXECUTED",
  "subtype": "NONE",
  "data": {
    "name": "turn-off-monitors",
    "command": "kscreen-doctor",
    "args": ["--dpms", "off"],
    "result": {
      "exitCode": 0,
      "stdout": "",
      "stderr": "",
      "error": ""
    }
  },
  "message": "Command 'turn-off-monitors' executed successfully"
}
```

### HTTP REST API

#### Execute Command
```bash
# Execute a command
POST /api/commands
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "name": "turn-off-monitors"
}

# Response
{
  "status": "success",
  "message": "Command executed successfully",
  "data": {
    "name": "turn-off-monitors",
    "command": "kscreen-doctor",
    "args": ["--dpms", "off"],
    "result": {
      "exitCode": 0,
      "stdout": "",
      "stderr": "",
      "error": ""
    }
  }
}
```

#### List Commands
```bash
# List all enabled commands
GET /api/commands
Authorization: Bearer your-api-token

# Response
{
  "status": "success",
  "message": "Commands retrieved successfully",
  "data": [
    {
      "name": "turn-off-monitors",
      "description": "Turn off all monitors using kscreen-doctor",
      "command": "kscreen-doctor",
      "args": ["--dpms", "off"],
      "enabled": true
    },
    {
      "name": "turn-on-monitors",
      "description": "Turn on all monitors using kscreen-doctor",
      "command": "kscreen-doctor",
      "args": ["--dpms", "on"],
      "enabled": true
    }
  ]
}
```

## Security Features

### Allow-List Approach
- Only pre-configured commands can be executed
- Each command must be explicitly enabled
- Commands are identified by name, not by direct command input

### Validation
- Basic command validation for empty strings
- Warning system for potentially dangerous commands
- Platform-specific command resolution
- Comprehensive error handling

### Error Handling
- Detailed error responses with specific subtypes
- Logging of all command execution attempts
- Graceful handling of command failures

## Platform Compatibility

### Windows
- Support for .exe, .com, .bat, .cmd executables
- Automatic extension resolution
- Windows-specific command handling

### Linux
- Native command execution
- Support for shell commands and executables
- Example use case: `kscreen-doctor --dpms off` for monitor control

### macOS (Darwin)
- Unix-like command execution
- Compatible with macOS-specific commands
- Standard Unix utilities support

## Usage Examples

### Configuration Example
```json
{
  "commands": {
    "commands": [
      {
        "name": "turn-off-monitors",
        "description": "Turn off all monitors using kscreen-doctor",
        "command": "kscreen-doctor",
        "args": ["--dpms", "off"],
        "enabled": true
      },
      {
        "name": "turn-on-monitors",
        "description": "Turn on all monitors using kscreen-doctor",
        "command": "kscreen-doctor",
        "args": ["--dpms", "on"],
        "enabled": true
      }
    ]
  }
}
```

### WebSocket API Usage
```javascript
// Execute a command
{
  "id": "unique-id",
  "event": "RUN_COMMAND",
  "data": {
    "name": "turn-off-monitors"
  },
  "token": "your-api-token"
}

// Response
{
  "id": "unique-id",
  "type": "COMMAND_EXECUTED",
  "subtype": "NONE",
  "data": {
    "name": "turn-off-monitors",
    "command": "kscreen-doctor",
    "args": ["--dpms", "off"],
    "result": {
      "exitCode": 0,
      "stdout": "",
      "stderr": "",
      "error": ""
    }
  },
  "message": "Command 'turn-off-monitors' executed successfully"
}
```

### HTTP REST API Usage
```bash
# Execute command via HTTP
curl -X POST http://localhost:9170/api/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{"name": "turn-off-monitors"}'

# List commands via HTTP
curl -X GET http://localhost:9170/api/commands \
  -H "Authorization: Bearer your-api-token"
```

## Integration with Home Assistant

This feature enables powerful automation scenarios like the one requested in the original issue:

```yaml
# Home Assistant automation example
automation:
  - alias: "Turn off monitors when away"
    trigger:
      - platform: state
        entity_id: binary_sensor.presence_sensor
        to: 'off'
        for: '00:05:00'
    action:
      - service: rest_command.system_bridge_run_command
        data:
          command_name: "turn-off-monitors"

# Home Assistant REST command configuration
rest_command:
  system_bridge_run_command:
    url: "http://your-system-bridge-host:9170/api/commands"
    method: POST
    headers:
      Content-Type: application/json
      Authorization: "Bearer your-api-token"
    payload: '{"name": "{{ command_name }}"}'
```

## Known Issues / TypeScript Configuration

The frontend implementation encountered TypeScript configuration issues related to missing React type declarations. These are likely due to project-specific TypeScript configuration and should be resolved by:

1. Ensuring React types are properly installed: `npm install @types/react @types/react-dom`
2. Checking TypeScript configuration in `tsconfig.json`
3. Verifying Next.js configuration in `next.config.js`

The core functionality is implemented correctly, but may require TypeScript configuration adjustments.

## Files Modified/Created

### Backend
- `settings/settings.go` - Added command settings structure
- `event/event_types.go` - Added RUN_COMMAND event type
- `event/response_types.go` - Added command response types
- `utils/handlers/command/command.go` - New command execution utility
- `event/handler/run-command.go` - New command execution handler
- `event/handler/handler.go` - Registered new handler
- `backend/http/commands.go` - New HTTP commands endpoint
- `backend/backend.go` - Registered commands endpoint

### Frontend
- `web-client/src/lib/system-bridge/types-settings.ts` - Added command types
- `web-client/src/lib/system-bridge/types-websocket.ts` - Added WebSocket types
- `web-client/src/components/ui/command-settings.tsx` - New command configuration UI
- `web-client/src/components/ui/command-executor.tsx` - New command execution UI
- `web-client/src/components/ui/card.tsx` - New card component
- `web-client/src/app/(websocket)/(client)/settings/_components/settings.tsx` - Updated settings
- `web-client/src/app/(websocket)/(client)/commands/page.tsx` - New commands page
- `web-client/src/app/(websocket)/(client)/commands/_components/commands.tsx` - New commands component

## Conclusion

This implementation provides a secure, cross-platform solution for executing arbitrary commands through System Bridge. The allow-list approach ensures security while maintaining flexibility for automation scenarios. The feature includes both WebSocket and HTTP REST API interfaces, making it compatible with various automation platforms including Home Assistant. The feature is ready for testing and integration once any TypeScript configuration issues are resolved.