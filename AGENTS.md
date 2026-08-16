# System Bridge - Agent Guidelines

Cross-platform application (Linux, Windows, macOS) that bridges system information to applications like Home Assistant via HTTP/WebSocket APIs.

## Quick Start

```bash
# Build and run
mise run build:all  # Build everything (frontend + backend)
mise run run        # Run backend + web in the foreground
mise run serve:all  # Start backend + web through pitchfork in the background
mise run test       # Run tests

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
- **Omarchy plugin**: Publishable source at `omarchy-plugin/`; generated mirror at `timmo001/omarchy-system-bridge`

## Key Conventions

- **Build system**: Always use mise tasks (`mise run <task>`), not direct `go build`
- **Package manager**: bun for all JavaScript/TypeScript (web client, TUI, docs)
- **Schema sync**: Run `mise run generate:schemas` after changing Go types in `types/`. Never hand-edit `web-client/src/lib/system-bridge/types-modules-schemas.ts` - it is generated
- **OS-specific code**: Use build tags in subpackages (see [architecture.md](.agents/architecture.md))

## Background Dev Servers

- Prefer the `serve:*` mise tasks over foreground `run:*` tasks when starting long-running dev servers from an agent or background workflow.
- `mise run serve:backend` starts the backend through pitchfork. The wrapper stops any production `system-bridge` process that owns `:9170` (systemd, Hyprland, desktop autostart, or manual shell), runs the dev backend, and restores the previously running live service or process when dev stops.
- `mise run serve:web` starts the Vite web client through pitchfork. It has no production counterpart.
- Use `mise run serve:status`, `mise run serve:logs`, `mise run serve:restart`, and `mise run serve:stop` for status, logs, restart, and cleanup.
- Keep direct `mise run run:*` usage for foreground debugging only, or when pitchfork is unavailable.
- The pitchfork config lives in `pitchfork.toml`; wrapper scripts live under `.scripts/linux/pitchfork-*.sh`.

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
mise run package:all   # DEB, RPM, Arch, Flatpak (Linux host only)
mise run package:deb            # or package:rpm / package:arch / package:flatpak
mise run package:windows-installer
```

## Omarchy Plugin

- Edit `omarchy-plugin/` in this repository. Do not edit the generated
  `timmo001/omarchy-system-bridge` repository directly.
- The plugin must remain self-contained, with no symlinks or imports outside
  `omarchy-plugin/`.
- Run `mise run omarchy-plugin:test-publisher` and
  `mise run omarchy-plugin:validate` after changing it.
- A validated push to `dev` publishes the directory and root `LICENSE` to the
  generated repository through `.github/workflows/publish-omarchy-plugin.yml`.

## Additional Documentation

- [Architecture](.agents/architecture.md) - Code structure, data modules, API design

## Project Skills

Task-scoped skills load on demand from `.agents/skills/` (registered via `skills.paths` in `opencode.json`):

- `go-backend` - Go backend patterns: error wrapping, graceful degradation, slog, context, nil safety
- `testing-workflow` - Go tests, web-client checks, Chrome DevTools MCP, schema verification, act
- `troubleshooting` - build/runtime fixes and per-OS file locations
- `docs-page-workflow` - add or restructure Starlight docs pages
- `landing-content-updates` - edit the docs landing page
