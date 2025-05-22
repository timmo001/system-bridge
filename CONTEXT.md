# CONTEXT.md

## Build, Lint, and Test

- **Build Go Backend:**  
  `make build` or `go build .`
- **Install Go Backend:**  
  `make install` or `go install .`
- **Run Backend (dev):**  
  `make run` or `./system-bridge backend`
- **Build Web Client:**  
  `make build_client` or `cd web-client && bun install && STATIC_EXPORT=true bun run build`
- **Dependency Management:**  
  `make deps` or `go mod tidy`
- **Clean Artifacts:**  
  `make clean`
- **Lint:**  
  No explicit lint target; use `gofmt`, `go vet`, and optionally `golangci-lint` manually.
- **Testing:**  
  No Go test files present or configured yet.
- **GitHub Actions:**  
  Use `act` to run/test workflows locally (see `.cursor/rules/workflows.mdc`).

## Code Style Guidelines

- **Imports:**  
  - Group standard, third-party, and internal packages separately (Go convention).
  - Use minimal import paths; avoid aliases unless needed.
- **Formatting:**  
  - Use `gofmt` for formatting. Run `goimports` to order/group imports.
- **Types & Naming:**  
  - PascalCase for exported types, functions, variables.
  - camelCase for unexported names. Acronyms are PascalCase (`APIKey`).
  - Descriptive names preferred.
- **Error Handling:**  
  - Handle errors explicitly; log or return as appropriate.
  - Use `%v` for error printing in logs.
- **Project-specific Rules:**  
  - Public APIs (HTTP/WebSocket) must be protected via token logic in `settings/settings.go`.
  - Data handlers in `event/handler/` must only expose one registration/getter; helpers in subpackages.
  - Use units matching Home Assistant’s system-bridge integration (`.cursor/rules/v4-migration.mdc`).
  - Shared utilities are in `utils/`.
- **General:**
  - Prefer Go idioms. See `.cursor/rules/` for architecture/migration notes.
