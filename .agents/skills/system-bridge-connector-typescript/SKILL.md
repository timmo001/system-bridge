---
name: system-bridge-connector-typescript
description: Work on the System Bridge TypeScript connector (@timmo001/effect-system-bridge) in connector/typescript. Use when changing its Effect services, schemas, errors, generated module schemas, tests or packaging, or when running its lint, type check, test or build tasks.
---

# System Bridge TypeScript Connector

The `@timmo001/effect-system-bridge` package in `connector/typescript/` is an Effect v4 connector for the backend's HTTP and WebSocket APIs. The web client uses it through the Bun workspace (`workspace:*`). Load the `effect` skill alongside this one.

## Layout

- `src/http.ts`: `SystemBridgeApi` (`HttpApi`) and the `SystemBridgeHttp` service built on `HttpApiClient`
- `src/websocket.ts`: the `SystemBridgeWebSocket` service on `effect/socket`. It matches replies to requests by id, waits for the expected response type and publishes `DATA_UPDATE` messages to the `updates` stream
- `src/protocol.ts`: event and response types, request and reply payload schemas, settings
- `src/errors.ts`: tagged errors
- `src/generated/modules.ts`: generated module schemas. Never edit by hand

## Generated schemas

`mise run generate:schemas` regenerates `src/generated/modules.ts` from the Go types in `types/`, using `tools/generate-schemas`. Run it after changing those types, then `go test ./tools/generate-schemas/`. The connector CI fails when the committed file is out of date.

## Tasks

All tasks live in the root `mise.toml` and run from the repository root. They depend on `install:js`, which installs the root Bun workspace.

- **All checks**: `mise run lint:connector:typescript ::: typecheck:connector:typescript ::: test:connector:typescript`
- **Lint**: `mise run lint:connector:typescript` (Oxlint with `@timmo001/oxlint-rules` `recommended-effect`, type-aware, and a Prettier check)
- **Type check**: `mise run typecheck:connector:typescript` (source, then tests with `tsconfig.test.json`)
- **Format**: `mise run format:connector:typescript`
- **Test**: `mise run test:connector:typescript` (`bun test`)
- **Build**: `mise run build:connector:typescript`

`mise run check` and `mise run lint:all` include the connector.

## Code style

- Lint must pass with no warnings. Fix findings rather than disabling rules
- Prefer Effect's own modules (`HttpApiClient`, `Socket`, `Schema`, `PubSub`) over hand-written clients or parsing
- Decode every backend payload through a Schema and map failures to the connector's tagged errors
- Keep tokens in `Redacted`
- Tests use `bun:test` with fake backends from `Bun.serve`. Fixtures in `test/fixtures/` are trimmed, sanitised module data; never commit captured data from a real machine as-is

## Releases

- The connector is released with System Bridge. Each stable GitHub release publishes it to npm and JSR from `build-and-package-application.yml`.
- `version` in `package.json` and `jsr.json` stays `0.0.0`. CI sets it from the release tag, so don't bump it by hand.
- `LICENSE` lives at the repository root. The `build` script copies it into `connector/typescript/`, and that copy is gitignored.
