# Troubleshooting

## Build Issues

### Web Client Build Not Found

If you see errors about missing `web-client/dist/index.html`:

```bash
# Clean and rebuild
make clean_web_client
make build_web_client

# On Windows, wait for filesystem sync
# The Makefile includes automatic sync delays
```

### Go Embed Issues

After changing web client files, always rebuild:

```bash
make build  # This rebuilds web client AND Go binary
```

The `//go:embed` directive includes files at compile time, so changes to web client files require recompiling the Go binary.

### Module/Dependency Issues

```bash
# Clean Go module cache
go clean -modcache

# Re-download dependencies
go mod download

# Verify dependencies
go mod verify
go mod tidy
```

## Runtime Issues

### Port Already in Use

Default port is 9170. If it's already in use:

```bash
# Check what's using the port
lsof -i :9170  # Linux/macOS
netstat -ano | findstr :9170  # Windows

# Use a different port
export SYSTEM_BRIDGE_PORT=9171
./system-bridge-linux
```

### Token Issues

If authentication fails:

```bash
# Check token location (varies by OS)
# Linux: ~/.config/system-bridge/token
# Windows: %APPDATA%\system-bridge\token
# macOS: ~/Library/Application Support/system-bridge/token

# Generate new token with the CLI
system-bridge client token
```

### Cross-Compilation Issues

When building for different platforms:

```bash
# Build for Linux from macOS/Windows
GOOS=linux GOARCH=amd64 go build -o system-bridge-linux

# Build for Windows from Linux/macOS
GOOS=windows GOARCH=amd64 go build -o system-bridge.exe

# Note: Some modules may not build due to OS-specific dependencies
```

## Web Client Issues

### TypeScript Errors After Dependency Update

```bash
cd web-client

# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild
pnpm build
```

### ESLint Errors

```bash
# Auto-fix what's possible
pnpm lint:fix

# For persistent errors, check:
# 1. Import order (must follow prescribed groups)
# 2. Naming conventions (camelCase, PascalCase, etc.)
# 3. No 'any' types (always provide explicit types)
```

## OS-Specific Issues

### Linux

- Ensure required system libraries are installed (see README.md)
- Some features require running as root/sudo (check module documentation)
- AppIndicator/systray may need additional libraries (libayatana-appindicator)

### Windows

- Use PowerShell (not cmd.exe) for modern command support
- Paths with spaces must be quoted
- Some features require Administrator privileges
- Use `make list_processes` and `make stop_processes` for debugging multiple instances

**Windows-specific development commands:**
```bash
make build_console        # Build console version (shows logs in terminal)
make run_console          # Run console version
make list_processes       # List running System Bridge processes
make stop_processes       # Stop all System Bridge processes
```

### macOS

- May need to grant permissions for system monitoring in System Preferences → Security & Privacy
- Some features are experimental on macOS
- M1/M2 architecture may have different behavior than Intel

## Quick Troubleshooting Commands

```bash
# Troubleshooting
make clean                    # Clean build artifacts
go mod tidy                   # Tidy dependencies
lsof -i :9170                 # Check port usage (Linux/macOS)
netstat -ano | findstr :9170  # Check port usage (Windows)
```

## File Locations Reference

```
Configuration & Data:
  Linux:   ~/.config/system-bridge/
  Windows: %APPDATA%\system-bridge\
  macOS:   ~/Library/Application Support/system-bridge/

Token:
  Linux:   ~/.config/system-bridge/token
  Windows: %APPDATA%\system-bridge\token
  macOS:   ~/Library/Application Support/system-bridge/token

Logs:
  Controlled by logging configuration in settings
```
