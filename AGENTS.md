# AGENTS.md

This project has a Go backend and a Next.js web client.

## Build

- **Backend**: `make build` - This will also build the web client as a dependency.
- **Web Client**: `make build_web_client` - This will build the web client.

The full build process can be found under `.github/workflows/build-and-package-application.yml`.

## Lint

- **Backend**: `golangci-lint run ./...`
- **Web Client**: `cd web-client && bun run lint`
- **Format**: `cd web-client && bun run format:write`

Other linting tools can be found under `.github/workflows/lint-*.yml`.

## Test

- **Backend**: `go test -v ./...`
- **Run a single test**: `go test -v -run TestMyFunction ./path/to/package`

The full test process can be found under `.github/workflows/test-application.yml`.

## Code Style

- **Go**: Follow standard Go conventions and use `golangci-lint` for linting.
- **TypeScript/Next.js**: Use `prettier` for formatting and `eslint` for linting. Adhere to existing conventions in the codebase.
- **Dependencies**: Use `go mod tidy` for Go under the root directory and `bun install` for the web client under `web-client/`.

## Project Structure

- The backend is in the root directory, with modules in `data/module`.
- The web client is in `web-client/`.
- Key files and architecture details are in `.cursor/rules/project.mdc`.
- Always use the `Makefile` for building as per `.cursor/rules/build-with-makefile.mdc`.
