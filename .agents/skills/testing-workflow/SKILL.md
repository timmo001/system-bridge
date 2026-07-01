---
name: testing-workflow
description: How to test System Bridge - Go table-driven tests and commands, web-client quality checks (lint/typecheck/format, no unit tests), the Chrome DevTools MCP interactive test loop for UI and WebSocket, the generate:schemas verification cycle, and running GitHub workflows locally with act. Use when writing or running system-bridge tests, verifying Go type/schema changes, or interactively testing the web client.
---

# System Bridge Testing

## Go Tests

```bash
mise run test                              # all Go tests
go test -v ./...                           # verbose
go test ./data/module/...                  # one package
go test -run TestCPUModule ./data/module/  # one test
go test -race ./...                        # race detector
go test -cover ./...                       # coverage
```

Place tests in `*_test.go` beside the code. Use table-driven tests:

```go
tests := []struct {
    name    string
    input   DataInput
    want    DataOutput
    wantErr bool
}{
    {"valid input", validInput, expectedOutput, false},
    {"invalid format", badInput, DataOutput{}, true},
}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) { /* ... */ })
}
```

Mock external dependencies (filesystem, network, system calls). Keep tests fast; avoid sleeps.

## Web Client Quality

The web client has **no automated unit tests** (Playwright/web-test-runner were removed). Quality is enforced by lint, typecheck, and format:

```bash
cd web-client
bun run lint        # ESLint
bun run typecheck   # tsc --noEmit
bun run format:check
```

Run the full application lint (Go + web client) with `mise run lint:all`. Docs have a separate check: `mise run docs:build` and `mise run docs:lint`.

## Interactive Testing with Chrome DevTools MCP

Functional web-client testing is done via the chrome-devtools MCP server.

```bash
mise run run   # backend (port 9170) + web client (port 5173)
```

Open http://localhost:5173 in Chrome, then drive it with the MCP tools:

- `take_snapshot` to read page state (add `verbose=true` to inspect ARIA).
- `click uid=...`, `fill uid=... value=...`, `navigate_page type="url" url=...`.
- `list_console_messages` / `get_console_message msgid=...` to catch errors.
- `list_network_requests` / `get_network_request reqid=...` for WebSocket traffic.

Always check the console for Zod validation errors after navigating the module tabs (Battery, CPU, Disks, ...).

## Verifying Schema Changes

After changing a Go struct in `types/`:

1. `mise run generate:schemas` to regenerate the Zod schemas.
2. `mise run run` and open the relevant page.
3. Confirm no console errors, data validates, and new fields render.

Never hand-edit `web-client/src/lib/system-bridge/types-modules-schemas.ts` - it is generated.

## Running GitHub Workflows Locally

```bash
act                                        # all workflows
act -W .github/workflows/<name>.yml        # one workflow
act -j <job>                               # one job
act -l                                     # list
```

Docker commands under `act` need sudo; pass secrets with `-s GITHUB_TOKEN=...`.

## Quick Reference

```bash
mise run test
cd web-client && bun run lint && bun run typecheck
go run . client data run --module cpu --pretty   # exercise a data module
```
