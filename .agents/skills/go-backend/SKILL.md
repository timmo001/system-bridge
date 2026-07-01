---
name: go-backend
description: System Bridge Go backend conventions - error wrapping, graceful degradation for data modules, nil-pointer safety, context-aware Module.Update, structured slog logging, and errcheck-clean deferred cleanup. Use when writing or reviewing Go code in the system-bridge backend (data modules, HTTP/WebSocket APIs, CLI, discovery).
---

# System Bridge Go Backend

Project-specific Go patterns for the system-bridge backend. General Go style an agent already knows is intentionally omitted.

## Format and Lint

- Always run `go fmt ./...` from the repo root after editing Go.
- Before committing, run `mise run lint:all` (or `golangci-lint run ./...`).
- CI runs golangci-lint. Watch `errcheck`: never leave unchecked error returns, especially deferred cleanup. All deferred `os.RemoveAll()` calls in tests must check the error.

## File Naming

- Go files `lowercase.go`, tests `_test.go`.
- OS-specific files use build-tag suffixes: `module_linux.go`, `module_windows.go`, `module_darwin.go`.
- Avoid generic names like `utils.go`; be specific.

## Error Handling

```go
// Wrap errors with context
if err != nil {
    return cpuData, fmt.Errorf("error getting CPU count: %v", err)
}

// Handle at the appropriate level; degrade gracefully only where safe
data, err := getData()
if err != nil {
    slog.Error("Failed to get data", "error", err)
    return defaultData, nil
}
```

- Always check and handle errors; wrap with `fmt.Errorf("context: %v", err)`.
- Return errors up the stack; don't log-and-continue unless there is a clear reason.

## Graceful Degradation

Data modules use best-effort strategies for optional metrics:

```go
if temps, err := sensors.SensorsTemperatures(); err == nil {
    cpuData.Temperature = extractTemperature(temps)
}
if cpuData.Temperature == nil {
    if t := cm.ReadCPUTemperature(); t != nil {
        cpuData.Temperature = t
    }
}
```

- **Use** for platform-specific features, optional enhancements, hardware-dependent data.
- **Do not use** for critical functionality (auth, core API), data integrity (settings, state), or user-initiated actions.

## Structured Logging

Use `log/slog` with structured fields, never string formatting:

```go
slog.Info("Getting CPU data")
slog.Error("Failed to fetch data", "module", moduleName, "error", err)
// Avoid: slog.Info(fmt.Sprintf("Getting CPU data for %s", name))
```

Levels: `Debug` (troubleshooting detail), `Info` (state changes), `Warn` (handled anomalies), `Error` (affects functionality without crashing).

## Nil-Pointer Safety

Optional values are pointer fields. Always nil-check before dereferencing, and give pointer targets a stable scope:

```go
if cpuData.Temperature != nil {
    useTemperature(*cpuData.Temperature)
}
temp := 75.0
cpuData.Temperature = &temp
```

## Context

Respect cancellation in `Module.Update`:

```go
func (m Module) Update(ctx context.Context) (any, error) {
    data, err := cpu.CountsWithContext(ctx, true)
    if err != nil {
        return nil, err
    }
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }
    // ...
}
```

## Performance

- Pre-allocate slices when size is known: `make([]types.PerCPU, 0, len(frequencies))`.
- Use context timeouts for external calls; avoid frequent polling.
- Pointers for large structs, values for small types.
