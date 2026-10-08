# System Bridge Connector - Agent Guidelines

Python library for connecting to System Bridge.

## Quick Start

Tasks run through mise, which sets up Python, uv and the `.venv`. Run `mise tasks` to list them.

- **Every check, in parallel**: `mise run check`
- **Only what a change needs**: for example `mise run lint ::: typecheck`
- **Lint**: `mise run lint` (Ruff, Ruff format check and Pylint)
- **Type check**: `mise run typecheck`
- **Format**: `mise run format`
- **Test all**: `mise run test`
- **Test single**: `mise run test tests/test_module.py::test_function`
- **Build**: `mise run build`

## Code Style

- **Python**: the `requires-python` version in `pyproject.toml`, which follows Home Assistant
- **Formatting**: 4-space indentation, Ruff formatter, 88 char line length
- **Imports**: sorted by Ruff, group first-party imports
- **Types**: Use type hints, prefer `|` union syntax, dataclasses with slots
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **Error handling**: Use specific exceptions, avoid bare except clauses
- **Docstrings**: Google-style, present tense
- **Testing**: Use pytest with syrupy for snapshots
