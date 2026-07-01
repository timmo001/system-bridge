---
name: troubleshooting
description: Known System Bridge build and runtime failures and their fixes, plus per-OS token/log/settings/data file locations. Use when a system-bridge build fails, the web-client embed is stale, ports conflict, token auth fails, cross-compilation breaks, or you need the on-disk data/log paths.
---

# System Bridge Troubleshooting

## Build

**Missing `web-client/dist/index.html`:**

```bash
mise run clean_web_client
mise run build_web_client
```

**Go embed stale after web-client changes:** the `//go:embed` directive bundles files at compile time, so rebuild the binary:

```bash
mise run build   # rebuilds web client AND Go binary
```

**Module / dependency issues:**

```bash
go clean -modcache
go mod download
go mod verify
go mod tidy
```

**TypeScript errors after a dependency update:**

```bash
cd web-client
rm -rf node_modules bun.lock
bun install
bun run build
```

## Runtime

**Port in use (default 9170):**

```bash
lsof -i :9170                  # Linux/macOS
netstat -ano | findstr :9170   # Windows
export SYSTEM_BRIDGE_PORT=9171
```

**Token / auth failures:** regenerate with `system-bridge client token`. Token path is under the per-OS data dir (see below).

**Cross-compilation:**

```bash
GOOS=linux   GOARCH=amd64 go build -o system-bridge-linux
GOOS=windows GOARCH=amd64 go build -o system-bridge.exe
```

Some modules may not cross-build due to OS-specific dependencies.

## OS-Specific

- **Linux:** install required system libraries (see README.md); systray may need `libayatana-appindicator`; some modules need root.
- **Windows:** use PowerShell; quote paths with spaces; some features need Administrator. Debug multiple instances with `mise run list_processes` / `mise run stop_processes`, and `mise run build_console` / `mise run run_console` for terminal logs.
- **macOS:** grant monitoring permissions in System Settings > Privacy & Security; some features are experimental; Apple Silicon may differ from Intel.

## File Locations

```
App data (settings, token):
  Linux:   ~/.local/share/system-bridge/v5/
  Windows: %LOCALAPPDATA%\system-bridge\v5\
  macOS:   ~/Library/Application Support/system-bridge/v5/

Token:      <app data>/token
Logs:
  Linux:   ~/.local/state/system-bridge/YYYY-MM-DD.log
  Windows: %LOCALAPPDATA%\system-bridge\logs\YYYY-MM-DD.log
  macOS:   ~/Library/Logs/system-bridge/YYYY-MM-DD.log
```

Legacy `system-bridge.log` files in the v5 app-data dir are migrated on next startup; daily logs older than 7 days are removed on startup.
