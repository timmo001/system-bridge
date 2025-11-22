# AGENTS.md

This file provides guidance to AI coding assistants (LLMs, code agents) when working with code in this repository.

## Table of Contents

- [Project Overview](#project-overview)
- [Build and Development Commands](#build-and-development-commands)
- [Architecture](#architecture)
- [Code Style and Conventions](#code-style-and-conventions)
- [Best Practices](#best-practices)
- [Platform Support](#platform-support)
- [Testing](#testing)
- [Package Creation](#package-creation)

## Project Overview

System Bridge is a cross-platform application (Linux, Windows, macOS/darwin) that provides a "bridge" to other applications like Home Assistant. It exposes system information and control capabilities via HTTP/WebSocket APIs, all protected by token authentication.

The project consists of:
- **Backend**: Go application serving HTTP/WebSocket APIs and managing system data
- **Web Client**: Lit + Vite application embedded in the Go binary
- **CLI**: Command-line interface for testing data modules and interacting with the system

## Build and Development Commands

Always use the Makefile for building:

```bash
# Build entire application (frontend + backend)
make build

# Run backend server (automatically builds first)
make run

# Run tests
make test

# Install dependencies
make deps

# Clean build artifacts
make clean
make clean_dist        # Also removes dist/ directory
make clean_web_client  # Removes web-client/dist/

# Show all available targets
make help
```

### Go Formatting

After editing any Go code, always run `go fmt ./...` from repository root to maintain consistent formatting.

### CLI Commands for Testing

Test data modules locally before committing:

```bash
# List all data modules
system-bridge client data list
# Or locally: go run . client data list

# Run a single module
system-bridge client data run --module cpu --pretty
# Or locally: go run . client data run --module cpu --pretty

# Run all modules
system-bridge client data run --all --pretty
# Or locally: go run . client data run --all --pretty

# Other client commands
system-bridge client token                    # Print API token
system-bridge client notification             # Send test notification
system-bridge client discovery list           # List discovered services
```

### Web Client Development

The web client is a Lit + Vite application in `web-client/`:

```bash
cd web-client

# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build (static export for embedding)
pnpm build

# Linting and formatting
pnpm format:check
pnpm format:write
pnpm typecheck
```

**Note**: The previous Next.js version has been preserved in `web-client-nextjs/` for reference.

## Architecture

### Code Structure

```
.
├── main.go              # Entry point - CLI commands, systray, signal handling
├── backend/             # HTTP and WebSocket server implementation
│   ├── backend.go       # Main backend orchestration
│   ├── http/            # HTTP endpoints
│   └── websocket/       # WebSocket server and message handlers
├── data/                # Data collection system
│   └── module/          # Data modules (cpu, memory, disks, etc.)
├── event/               # Event system
│   └── handler/         # Event handlers for WebSocket messages
├── settings/            # Settings management (settings.go)
├── utils/               # Shared utilities
│   ├── token.go         # Token management (separate from settings)
│   └── handlers/        # Action handlers (filesystem, keyboard, media, notification, power)
├── types/               # Shared type definitions
├── bus/                 # Internal event bus
├── discovery/           # mDNS service discovery
├── web-client/          # Lit + Vite frontend (embedded via go:embed)
└── web-client-nextjs/   # Previous Next.js version (reference)
```

### Data Module System

Data modules live under `data/module/`. Each module collects specific system information.

**OS-specific code structure** (important pattern):
- Top-level file (e.g., `data/module/system.go`) acts as a thin facade
- OS-specific implementation goes in a subpackage (e.g., `data/module/system/`)
- Use build tags in subpackage files: `//go:build linux` or `//go:build windows`
- The facade imports and calls the subpackage (e.g., `system.GetCameraUsage()`)
- Follow this pattern consistently (already used in `displays`, `gpus`, `media`, `system`)

Example structure:
```
data/module/
  system.go              # Facade, imports system subpackage
  system/
    system_linux.go      # //go:build linux
    system_windows.go    # //go:build windows
```

### API and Authentication

- **Token Authentication**: All HTTP/WebSocket endpoints require a token
  - Token is managed by `utils/token.go` and stored separately from settings
  - Load with `utils.LoadToken()`
- **Port**: Read from `SYSTEM_BRIDGE_PORT` environment variable (default: 9170)
- **Settings**: Managed by `settings/settings.go` (shared across packages)

### Backend Services

1. **HTTP Server** (`backend/http/`): REST endpoints for system control and data access
2. **WebSocket Server** (`backend/websocket/`):
   - Core: `websocket.go`
   - Message handling: `messages.go`
   - Handler registration: `handlers.go`
   - Internal access: `instance.go`
3. **Event Handlers** (`event/handler/`):
   - Each handler registers itself and processes specific event types
   - Functions should be in separate packages under `event/handler/<module>/`

### Web Client Embedding

The Vite static build is embedded at compile time:
```go
//go:embed all:web-client/dist/*
var webClientContent embed.FS
```

The Makefile ensures proper build sequencing and file sync verification.

## Code Style and Conventions

### Go Code Style

#### Formatting and Structure

- **Always run** `go fmt ./...` after editing any Go code
- Use meaningful variable names; avoid single-letter names except in short-lived scopes (loop indices, etc.)
- Keep functions focused and small; extract complex logic into helper functions
- Use early returns to reduce nesting depth

#### Error Handling

Follow consistent error handling patterns:

```go
// Good: Wrap errors with context
if err != nil {
    return cpuData, fmt.Errorf("error getting CPU count: %v", err)
}

// Good: Handle errors at the appropriate level
data, err := getData()
if err != nil {
    slog.Error("Failed to get data", "error", err)
    return defaultData, nil  // Graceful degradation when appropriate
}
```

**Important patterns:**
- Always check and handle errors; never ignore them
- Wrap errors with context using `fmt.Errorf("context: %v", err)`
- Use `slog` for logging errors with structured fields
- Return errors up the call stack; don't just log and continue unless there's a good reason
- For optional/best-effort operations, log failures but don't necessarily fail the entire operation

#### Logging

Use structured logging with `log/slog`:

```go
import "log/slog"

// Good: Structured logging with context
slog.Info("Getting CPU data")
slog.Error("Failed to fetch data", "module", moduleName, "error", err)
slog.Debug("Processing item", "id", itemID, "count", count)

// Avoid: String concatenation or formatting
slog.Info(fmt.Sprintf("Getting CPU data for %s", name))  // Don't do this
```

**Logging levels:**
- `Debug`: Detailed information for troubleshooting
- `Info`: General operational messages (module updates, state changes)
- `Warn`: Unexpected but handled situations
- `Error`: Errors that affect functionality but don't crash the application

#### Nil Pointer Safety

The codebase uses pointer fields extensively for optional values. Always check for nil:

```go
// Good: Check before dereferencing
if cpuData.Temperature != nil {
    useTemperature(*cpuData.Temperature)
}

// Good: Initialize pointer values
temp := 75.0
cpuData.Temperature = &temp

// Avoid: Creating pointers to temporary variables in loops
for _, item := range items {
    val := item.Value
    data.Values = append(data.Values, &val)  // OK - val has scope for this iteration
}
```

#### Context Usage

Always respect context cancellation:

```go
func (m Module) Update(ctx context.Context) (any, error) {
    // Pass context to all blocking operations
    data, err := cpu.CountsWithContext(ctx, true)
    if err != nil {
        return nil, err
    }

    // Check for cancellation in long operations
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
        // Continue processing
    }
}
```

### TypeScript/Lit Code Style

#### Component Structure

Follow Lit component patterns consistently:

```typescript
import { html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { UIElement } from "~/mixins";

@customElement("my-component")
export class MyComponent extends UIElement {
  // Public properties (attributes)
  @property() variant: "default" | "primary" = "default";
  @property({ type: Boolean }) disabled = false;

  // Internal state
  @state() private _internalValue = "";

  connectedCallback() {
    super.connectedCallback();
    // Setup lifecycle
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Cleanup
  }

  render() {
    return html`
      <div class="${this.variant}">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "my-component": MyComponent;
  }
}
```

#### Type Safety

- **Never use `any`** - it's configured as an error in ESLint
- Use `type` imports for type-only imports: `import type { MyType } from "./types"`
- Leverage Zod for runtime validation and type inference
- Define explicit return types for public methods

```typescript
// Good: Explicit types
function processData(input: DataInput): DataOutput {
  // ...
}

// Good: Type imports
import type { CPUData, ModuleData } from "~/lib/system-bridge/types-modules";

// Bad: Using any
function processData(input: any): any {  // ESLint error
  // ...
}
```

#### Naming Conventions

From ESLint configuration:
- **Variables**: `camelCase`, `UPPER_CASE` (constants), or `PascalCase` (components)
- **Types/Interfaces**: `PascalCase`
- **Functions/Methods**: `camelCase`
- **Private members**: Prefix with `_` (e.g., `_handleClick`, `_internalValue`)
- **Custom elements**: Use kebab-case tags (e.g., `ui-button`, `theme-provider`)

#### Import Organization

ESLint enforces import ordering:

```typescript
// 1. Built-in modules (if any)
import { Context } from "@lit/context";

// 2. External modules
import { html } from "lit";
import { customElement } from "lit/decorators.js";

// 3. Internal modules
import { UIElement } from "~/mixins";
import { theme } from "~/contexts/theme";
```

Always maintain alphabetical ordering within each group.

#### Accessibility

- Always include appropriate ARIA attributes for interactive elements
- Use semantic HTML elements
- Provide keyboard event handlers for click events
- Include alt text for images
- Ensure proper focus management

```typescript
// Good: Accessible button
this.setAttribute("role", "button");
this.tabIndex = 0;
this.setAttribute("aria-disabled", this.disabled ? "true" : "false");

// Good: Keyboard support
this.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    this._handleClick();
  }
});
```

#### No Console Logs

- `console.log`, `console.warn`, etc. are **ESLint errors**
- Use proper debugging techniques or remove debug code before committing
- For user-facing messages, use the notifications system

### General Conventions

#### File Naming

- **Go files**: `lowercase.go`, use `_test.go` suffix for tests
- **Go OS-specific**: `module_linux.go`, `module_windows.go`, `module_darwin.go`
- **TypeScript**: `kebab-case.ts` for components, `camelCase.ts` for utilities
- **Avoid** generic names like `utils.go` or `helpers.ts` - be specific

#### Git Commits

- Use clear, descriptive commit messages
- Start with a verb in present tense: "Add", "Fix", "Update", "Remove", "Refactor"
- Reference issue numbers when applicable
- Keep commits focused on a single change

```bash
# Good commit messages
git commit -m "Add CPU power monitoring for Linux"
git commit -m "Fix WebSocket reconnection logic"
git commit -m "Update dependencies and run go mod tidy"

# Avoid vague messages
git commit -m "fixes"
git commit -m "WIP"
git commit -m "update stuff"
```

## Best Practices

### Performance Considerations

#### Go Performance

- **Minimize allocations**: Reuse slices with `make([]T, 0, capacity)` when size is known
- **Avoid blocking operations**: Use context with timeouts for external calls
- **Efficient sampling**: Use appropriate intervals for CPU/system monitoring (don't poll too frequently)
- **Pointer vs value**: Use pointers for large structs, values for small types

```go
// Good: Pre-allocate slice capacity
perCPU := make([]types.PerCPU, 0, len(frequencies))

// Good: Non-blocking CPU usage
percentageInterval := 0 * time.Second  // Instantaneous, non-blocking
percents, err := cpu.PercentWithContext(ctx, percentageInterval, false)

// Good: Fetch once, reuse
timesPerCPU, _ := cpu.TimesWithContext(ctx, true)
```

#### Web Client Performance

- **Lazy load** heavy components
- **Debounce** frequent updates (WebSocket messages, resize events)
- **Virtual scrolling** for long lists
- Use `@state` sparingly; prefer deriving computed values in `render()`
- Minimize re-renders by carefully managing reactive properties

### Security

- **Never commit secrets** (tokens, API keys, passwords)
- All API endpoints require token authentication
- Validate all external input
- Use parameterized queries (if/when database is added)
- Keep dependencies updated

### Dependency Management

#### Adding Go Dependencies

```bash
# Add a new dependency
go get github.com/username/package

# After adding, always tidy
go mod tidy

# Verify module integrity
go mod verify
```

#### Adding Web Client Dependencies

```bash
cd web-client

# Add dependency
pnpm add package-name

# Add dev dependency
pnpm add -D package-name

# Update dependencies
pnpm update

# Check for outdated packages
pnpm outdated
```

**When adding new dependencies:**
- Prefer well-maintained packages with active communities
- Check license compatibility
- Document any system dependencies in README.md
- Update `CLAUDE.md` if dependency affects build process

### Error Handling Strategies

#### Graceful Degradation

Many data modules use "best-effort" strategies for optional features:

```go
// Best-effort: Try to get temperature, continue if unavailable
if temps, err := sensors.SensorsTemperatures(); err == nil {
    cpuData.Temperature = extractTemperature(temps)
}

// OS-specific fallback
if cpuData.Temperature == nil {
    if t := cm.ReadCPUTemperature(); t != nil {
        cpuData.Temperature = t
    }
}
```

**When to use graceful degradation:**
- Platform-specific features (not all OSes support all metrics)
- Optional enhancements (extra details that aren't critical)
- Hardware-dependent data (not all systems have all sensors)

**When NOT to use:**
- Critical functionality (authentication, core API operations)
- Data integrity (settings persistence, state management)
- User-initiated actions (they should see clear success/failure)

### Testing Philosophy

- Test public APIs and critical paths
- Use table-driven tests for multiple scenarios
- Mock external dependencies (filesystem, network, system calls)
- Test error conditions, not just happy paths
- Keep tests fast; avoid sleeps and long timeouts

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

## Platform Support

- **Supported OS**: Linux (prioritize Arch/Ubuntu), Windows (latest), macOS (experimental)
- **CPU architectures**: Intel/AMD/Apple Silicon only, no legacy/32-bit
- **Command examples**:
  - Windows: Use modern PowerShell, winget
  - Linux: Provide pacman (Arch) and apt (Debian/Ubuntu) examples
  - macOS: Use Homebrew

When adding external dependencies, document installation steps in README.md with per-OS commands.

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

## Windows-Specific Development

Windows has additional targets for process management and debugging:

```bash
make build_console        # Build console version (shows logs in terminal)
make run_console          # Run console version
make list_processes       # List running System Bridge processes
make stop_processes       # Stop all System Bridge processes
```

## Package Creation

Linux packaging (run on Linux host only):

```bash
make create_all_packages  # Build all formats in parallel (DEB, RPM, Arch, Flatpak)
make create_deb           # Debian package only
make create_rpm           # RPM package only
make create_arch          # Arch package only
make create_flatpak       # Flatpak package only
```

Windows installer:

```bash
make create_windows_installer
```
