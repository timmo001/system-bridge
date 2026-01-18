# Architecture

## Code Structure

```
.
├── main.go              # Entry point - CLI commands, systray, signal handling
├── backend/             # HTTP and WebSocket server implementation
│   ├── backend.go       # Main backend orchestration
│   ├── http/            # HTTP endpoints
│   ├── websocket/       # WebSocket server and message handlers
│   └── mcp/             # MCP (Model Context Protocol) server
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

## Data Module System

Data modules live under `data/module/`. Each module collects specific system information.

### OS-Specific Code Pattern

**Important:** This is the required pattern for all OS-specific functionality:

- Top-level file (e.g., `data/module/system.go`) acts as a thin facade
- OS-specific implementation goes in a subpackage (e.g., `data/module/system/`)
- Use build tags in subpackage files: `//go:build linux` or `//go:build windows`
- The facade imports and calls the subpackage (e.g., `system.GetCameraUsage()`)

**Example structure:**
```
data/module/
  system.go              # Facade, imports system subpackage
  system/
    system_linux.go      # //go:build linux
    system_windows.go    # //go:build windows
    system_darwin.go     # //go:build darwin
```

**Already using this pattern:** `displays`, `gpus`, `media`, `system`

## API and Authentication

- **Token Authentication**: All HTTP/WebSocket endpoints require a token
  - Token is managed by `utils/token.go` and stored separately from settings
  - Load with `utils.LoadToken()`
- **Port**: Read from `SYSTEM_BRIDGE_PORT` environment variable (default: 9170)
- **Settings**: Managed by `settings/settings.go` (shared across packages)

## Backend Services

1. **HTTP Server** (`backend/http/`): REST endpoints for system control and data access

2. **WebSocket Server** (`backend/websocket/`):
   - Core: `websocket.go`
   - Message handling: `messages.go`
   - Handler registration: `handlers.go`
   - Internal access: `instance.go`

3. **MCP Server** (`backend/mcp/`):
   - Model Context Protocol server for AI assistant integration
   - Exposes system capabilities as standardized tools
   - WebSocket transport with token authentication
   - See `backend/mcp/README.md` for detailed documentation

4. **Event Handlers** (`event/handler/`):
   - Each handler registers itself and processes specific event types
   - Functions should be in separate packages under `event/handler/<module>/`

## Web Client Embedding

The Vite static build is embedded at compile time:
```go
//go:embed all:web-client/dist/*
var webClientContent embed.FS
```

The Makefile ensures proper build sequencing and file sync verification.

## Schema Generation

The project includes an automatic schema generator that keeps frontend and backend types in sync:

```bash
# Generate Zod schemas from Go types (runs automatically during build)
make generate_schemas
```

**How it works:**
- Parses Go struct definitions in `types/` directory
- Generates TypeScript Zod schemas in `web-client/src/lib/system-bridge/types-modules-schemas.ts`
- Runs automatically before every `make build` or `make build_web_client`
- See `tools/generate-schemas/README.md` for details

**Important:** Never manually edit `types-modules-schemas.ts` - it's auto-generated. When adding new types to `types/`, run `make generate_schemas` to update the frontend schemas.

## Web Client Development

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

## CLI Commands for Testing

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

## Dependency Management

### Adding Go Dependencies

```bash
# Add a new dependency
go get github.com/username/package

# After adding, always tidy
go mod tidy

# Verify module integrity
go mod verify
```

### Adding Web Client Dependencies

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
