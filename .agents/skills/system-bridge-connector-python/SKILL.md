---
name: system-bridge-connector-python
description: Work on the System Bridge Python connector (systembridgeconnector) in connector/python. Use when changing its models, HTTP or WebSocket clients, tests or packaging, or when running its lint, type check, test or build tasks.
---

# System Bridge Python Connector

The `systembridgeconnector` package in `connector/python/` is the Python library the Home Assistant integration uses to talk to the backend.

## Tasks

All tasks live in the root `mise.toml` and run from the repository root. mise provides Python and uv; the tasks keep the venv at `connector/python/.venv`.

- **Lint, type check and test**: `mise run lint:connector:python ::: typecheck:connector:python ::: test:connector:python`
- **Lint**: `mise run lint:connector:python` (Ruff, Ruff format check and Pylint)
- **Type check**: `mise run typecheck:connector:python`
- **Format**: `mise run format:connector:python`
- **Test all**: `mise run test:connector:python`
- **Test single**: `mise run test:connector:python tests/test_module.py::test_function`
- **Build**: `mise run build:connector:python`

`mise run check` and `mise run lint:all` include the connector.

## Code Style

- **Python**: the `requires-python` version in `pyproject.toml`, which follows Home Assistant
- **Formatting**: 4-space indentation, Ruff formatter, 88 char line length
- **Imports**: sorted by Ruff, group first-party imports
- **Types**: Use type hints, prefer `|` union syntax, dataclasses with slots
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **Error handling**: Use specific exceptions, avoid bare except clauses
- **Docstrings**: Google-style, present tense
- **Testing**: Use pytest with syrupy for snapshots

## Releases

- The connector is released with System Bridge. Each stable GitHub release publishes it to PyPI from `build-and-package-application.yml`.
- `version` in `pyproject.toml` stays `0.0.0`. CI sets it from the release tag, so don't bump it by hand.
- `LICENSE` lives at the repository root. `build:connector:python` copies it into `connector/python/` before building, and that copy is gitignored.
