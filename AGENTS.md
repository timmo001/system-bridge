# System Bridge - Agent Guidelines

Cross-platform application (Linux, Windows, macOS) that bridges system information to applications like Home Assistant via HTTP/WebSocket APIs.

## Quick Start

```bash
# Build and run
mise run build    # Build everything (frontend + backend)
mise run run      # Run backend server
mise run test     # Run tests

# See all commands
mise tasks
```

**After editing Go code:** Always run `go fmt ./...`

## Project Structure

- **Backend**: Go application (HTTP/WebSocket APIs)
- **MCP Server**: Model Context Protocol server
- **Web Client**: Lit + Vite (embedded in Go binary at `web-client/`)
- **CLI**: Command-line interface

## Key Conventions

- **Build system**: Always use mise tasks (`mise run <task>`), not direct `go build`
- **Package manager**: bun for all JavaScript/TypeScript (web client + TUI)
- **Schema sync**: Run `mise run generate_schemas` after changing Go types in `types/` directory
- **OS-specific code**: Use build tags in subpackages (see [architecture.md](.agents/architecture.md))

## Additional Documentation

- [Architecture](.agents/architecture.md) - Code structure, data modules, API design
- [Go Style](.agents/go-style.md) - Error handling, logging, formatting, linting
- [TypeScript/Lit Style](.agents/typescript-style.md) - Component patterns, type safety, accessibility
- [Testing](.agents/testing.md) - Go tests, web client quality checks, Chrome DevTools testing
- [Troubleshooting](.agents/troubleshooting.md) - Common issues and solutions
- [Platform Support](.agents/platform-support.md) - OS-specific considerations
- [Packaging](.agents/packaging.md) - Creating installers and packages
