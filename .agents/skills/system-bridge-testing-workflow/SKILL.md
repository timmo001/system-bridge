---
name: system-bridge-testing-workflow
description: How to test System Bridge - Go table-driven tests and commands, web-client quality checks (lint/typecheck/format, no unit tests), the interactive browser test loop for UI and WebSocket with the Playwright or Chrome DevTools MCP, the generate:schemas verification cycle, and running GitHub workflows locally with act. Use when writing or running system-bridge tests, verifying Go type/schema changes, or interactively testing the web client.
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
cd client/web
bun run lint        # Oxlint with type-aware, Lit and Web Components rules
bun run typecheck   # tsc --noEmit
bun run format:check
```

Run the full application lint (Go + web client) with `mise run lint:all`. Docs have a separate check: `mise run docs:build` and `mise run docs:lint`.

## Interactive Testing in the Browser

Functional web-client testing uses whichever browser MCP is loaded, Playwright or Chrome DevTools. Neither is preferred.

```bash
mise run serve:all   # backend on :9170 + web client, through pitchfork
```

Open the web client at https://web.system-bridge.localhost. It connects from URL parameters, as `system-bridge client open` does: add `?host=127.0.0.1&port=9170&apiKey=<token>` to any page, with the token from the data folder (see `system-bridge-troubleshooting`). Pages are at `/<module>`, such as `/desktop`.

- Read page state from the accessibility snapshot, and find elements by text or role rather than reading the whole snapshot.
- Check the console for errors, and the network or WebSocket traffic when a request misbehaves.
- With Playwright, a missing browser fails with "Browser "chromium" is not installed". Install it with `npx @playwright/mcp install-browser chromium`.

Always check the console for schema decode errors after navigating the module tabs (Battery, CPU, Disks, ...). Errors that name a file you were editing may be from a hot reload mid-edit, so reload the page before treating them as real.

## Verifying Schema Changes

After changing a Go struct in `types/`:

1. `mise run generate:schemas` to regenerate the connector's Effect schemas.
2. `mise run run` and open the relevant page.
3. Confirm no console errors, data validates, and new fields render.

Never hand-edit `connector/typescript/src/generated/modules.ts` - it is generated.

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
cd client/web && bun run lint && bun run typecheck
go run . client data run --module cpu --pretty   # exercise a data module
```
