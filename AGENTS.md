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
- **Docs**: Astro + Starlight site at `docs/` (deployed separately)

## Key Conventions

- **Build system**: Always use mise tasks (`mise run <task>`), not direct `go build`
- **Package manager**: bun for all JavaScript/TypeScript (web client, TUI, docs)
- **Schema sync**: Run `mise run generate_schemas` after changing Go types in `types/`. Never hand-edit `web-client/src/lib/system-bridge/types-modules-schemas.ts` - it is generated
- **OS-specific code**: Use build tags in subpackages (see [architecture.md](.agents/architecture.md))

## Platforms

- **OS**: Linux (prioritise Arch/Ubuntu), Windows (latest), macOS (experimental)
- **Architectures**: Intel/AMD/Apple Silicon only; no legacy/32-bit
- **Command examples**: PowerShell/winget (Windows), pacman + apt (Linux), Homebrew (macOS). Document new external dependencies per-OS in README.md

## Web Client

- Uses the `~/` path alias and the `UIElement` mixin from `~/mixins`
- `any` is an ESLint error in the web-client config
- Zod provides runtime validation and type inference
- Checks: `cd web-client && bun run lint`, `bun run typecheck`, `bun run format:check`

## Packaging

```bash
mise run create_all_packages   # DEB, RPM, Arch, Flatpak (Linux host only)
mise run create_deb            # or create_rpm / create_arch / create_flatpak
mise run create_windows_installer
```

## Additional Documentation

- [Architecture](.agents/architecture.md) - Code structure, data modules, API design

## Project Skills

Task-scoped skills load on demand from `.agents/skills/` (registered via `skills.paths` in `opencode.json`):

- `go-backend` - Go backend patterns: error wrapping, graceful degradation, slog, context, nil safety
- `testing-workflow` - Go tests, web-client checks, Chrome DevTools MCP, schema verification, act
- `troubleshooting` - build/runtime fixes and per-OS file locations
- `docs-page-workflow` - add or restructure Starlight docs pages
- `landing-content-updates` - edit the docs landing page
