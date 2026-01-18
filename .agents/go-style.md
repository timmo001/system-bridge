# Go Code Style

## Formatting and Linting

### Always Format After Editing

After editing any Go code, always run `go fmt ./...` from repository root to maintain consistent formatting.

### Linting Before Commit

Before committing Go code changes, run the linter to catch potential issues:

```bash
# Run golangci-lint (if installed locally)
golangci-lint run ./...

# Or run the project's lint target
make lint
```

**Important**: The CI pipeline runs golangci-lint automatically. Common issues to watch for:
- `errcheck`: Unchecked error returns (especially in deferred cleanup)
- Use proper error handling patterns as shown in existing code
- All deferred `os.RemoveAll()` calls must check errors in tests

## Code Organization

- Use meaningful variable names; avoid single-letter names except in short-lived scopes (loop indices, etc.)
- Keep functions focused and small; extract complex logic into helper functions
- Use early returns to reduce nesting depth

### File Naming

- **Go files**: `lowercase.go`, use `_test.go` suffix for tests
- **Go OS-specific**: `module_linux.go`, `module_windows.go`, `module_darwin.go`
- **Avoid** generic names like `utils.go` - be specific

## Error Handling

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

### Graceful Degradation

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

## Logging

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

## Nil Pointer Safety

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

## Context Usage

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

## Performance Considerations

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

## Git Commits

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
