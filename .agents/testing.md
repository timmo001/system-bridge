# Testing

## Running Tests

### Go Tests

```bash
# Run all tests
make test

# Run tests with verbose output
go test -v ./...

# Run tests for a specific package
go test ./data/module/...

# Run tests with coverage
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out  # View coverage in browser

# Run a specific test
go test -run TestCPUModule ./data/module/

# Run tests with race detector
go test -race ./...
```

### Web Client Code Quality

The web client does not have automated unit tests. Code quality is maintained through linting, type checking, and formatting:

```bash
cd web-client

# Run linter
pnpm lint

# Fix linting errors automatically
pnpm lint:fix

# Type checking
pnpm typecheck

# Format checking
pnpm format:check

# Format automatically
pnpm format:write
```

### Running All Linters (GitHub Workflow)

To run all linters used in the GitHub workflows:

```bash
# Application linting (Go + web client)
make lint

# Web client formatting
cd web-client && pnpm format:check

# Markdown linting (ignoring node_modules)
bunx markdownlint-cli . --ignore node_modules --ignore web-client/node_modules

# YAML linting (project files only)
uv tool run yamllint .github/ .scripts/
```

## Writing Tests

### Go Test Structure

Place tests in `*_test.go` files alongside the code they test:

```
data/module/
  cpu.go
  cpu_test.go
  cpu/
    cpu_linux.go
    cpu_windows.go
```

Use the standard testing package and follow table-driven test patterns.

### Table-Driven Tests

```go
// Good: Table-driven test
func TestProcessData(t *testing.T) {
    tests := []struct {
        name    string
        input   DataInput
        want    DataOutput
        wantErr bool
    }{
        {"valid input", validInput, expectedOutput, false},
        {"empty input", emptyInput, emptyOutput, false},
        {"invalid format", badInput, DataOutput{}, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ProcessData(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("ProcessData() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            // Assert got == tt.want
        })
    }
}
```

### Testing Philosophy

**Go Tests:**
- Test public APIs and critical paths
- Use table-driven tests for multiple scenarios
- Mock external dependencies (filesystem, network, system calls)
- Test error conditions, not just happy paths
- Keep tests fast; avoid sleeps and long timeouts

**Web Client:**
- No automated unit tests (removed Playwright/web-test-runner)
- Code quality enforced through ESLint, TypeScript, and Prettier
- Functional testing done manually using Chrome DevTools MCP server
- Focus on interactive testing for UI components and WebSocket communication

## Interactive Testing with Chrome DevTools

For testing web client changes and WebSocket communication, use the chrome-devtools MCP server for interactive browser testing:

### Setup

1. **Start the development environment:**
```bash
make run  # Starts both backend (port 9170) and web client (port 5173)
```

2. **Access via browser:**
   - Open http://localhost:5173 in Chrome
   - The chrome-devtools MCP tools are available for automation

### Testing Workflow

**Test UI components and interactions:**
```bash
# Take snapshots to see current page state
mcp__chrome-devtools__take_snapshot

# Click elements (use uid from snapshot)
mcp__chrome-devtools__click uid="element_uid"

# Fill forms
mcp__chrome-devtools__fill uid="input_uid" value="test value"

# Navigate
mcp__chrome-devtools__navigate_page type="url" url="http://localhost:5173/data"

# Check console for errors
mcp__chrome-devtools__list_console_messages
```

**Test data validation and WebSocket communication:**
```bash
# 1. Navigate to data page
# 2. Click through module tabs (Battery, CPU, Disks, etc.)
# 3. Check console for Zod validation errors
# 4. Verify data displays correctly
```

### Common Testing Scenarios

**Testing schema changes:**
1. Modify Go struct in `types/` directory
2. Run `make generate_schemas` to update Zod schemas
3. Start dev environment with `make run`
4. Navigate to relevant page in browser
5. Use chrome-devtools to verify:
   - No console errors
   - Data validates correctly
   - UI displays new fields

**Testing WebSocket events:**
1. Connect to backend via web client
2. Monitor console messages for WebSocket events
3. Verify data updates in real-time
4. Check for validation errors in Zod schemas

**Testing accessibility:**
```bash
# Test keyboard navigation
mcp__chrome-devtools__press_key key="Tab"
mcp__chrome-devtools__press_key key="Enter"
mcp__chrome-devtools__press_key key=" "  # Space

# Verify ARIA attributes in snapshots
mcp__chrome-devtools__take_snapshot verbose=true
```

**Testing error states:**
1. Stop backend: Kill the `make run` process
2. Observe connection error handling in UI
3. Restart backend and verify reconnection

### Best Practices

- **Always check console**: Run `list_console_messages` to catch errors
- **Test all modules**: Systematically test each data module tab
- **Verify validation**: Ensure Zod schemas validate without errors
- **Test keyboard accessibility**: All interactive elements should work with keyboard
- **Check network requests**: Monitor WebSocket messages for correct data flow

### Debugging Tips

**Console errors:**
```bash
# List all console messages with types
mcp__chrome-devtools__list_console_messages includePreservedMessages=true

# Get detailed error message
mcp__chrome-devtools__get_console_message msgid=<id>
```

**Network issues:**
```bash
# List network requests
mcp__chrome-devtools__list_network_requests

# Get specific request details
mcp__chrome-devtools__get_network_request reqid=<id>
```

**Visual debugging:**
```bash
# Take screenshots
mcp__chrome-devtools__take_screenshot

# Take full page screenshot
mcp__chrome-devtools__take_screenshot fullPage=true
```

## Testing GitHub Workflows Locally

Use `act` for local workflow testing:

```bash
act                                          # Run all workflows
act -W .github/workflows/workflow-name.yml   # Run specific workflow
act -j job-name                              # Run specific job
act -l                                       # List all workflows

# For Docker commands, run with sudo
# Create .env file for secrets or use: -s GITHUB_TOKEN=your_token
```

## Quick Reference

```bash
# Testing
make test                     # Run Go tests
cd web-client && pnpm lint    # Lint web client
cd web-client && pnpm typecheck  # Type check web client
cd web-client && pnpm format:check  # Check web client formatting
go run . client data run --module cpu --pretty  # Test a data module
```
