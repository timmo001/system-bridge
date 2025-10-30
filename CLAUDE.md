# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

System Bridge is a cross-platform application (Linux, Windows, macOS/darwin) that provides a "bridge" to other applications like Home Assistant. It exposes system information and control capabilities via HTTP/WebSocket APIs, all protected by token authentication.

The project consists of:
- **Backend**: Go application serving HTTP/WebSocket APIs and managing system data
- **Web Client**: Next.js static site embedded in the Go binary
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
make clean_web_client  # Removes web-client/out/

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

The web client is a Next.js application in `web-client/`:

```bash
cd web-client

# Install dependencies
bun install

# Development mode
bun run dev

# Build (static export for embedding)
bun run build        # or STATIC_EXPORT=true bun run build

# Verify build succeeded
bun run verify-build

# Linting and formatting
bun run lint
bun run lint:fix
bun run format:check
bun run format:write
bun run typecheck
```

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
└── web-client/          # Next.js frontend (embedded via go:embed)
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

The Next.js static export is embedded at compile time:
```go
//go:embed web-client/out/*
var webClientContent embed.FS
```

The Makefile ensures proper build sequencing and file sync verification.

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
