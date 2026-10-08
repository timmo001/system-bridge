# System Bridge Connector - Agent Guidelines

Python library for connecting to System Bridge.

## Quick Start

- **Build**: `python -m build`
- **Lint**: `ruff check .` and `pylint systembridgeconnector`
- **Format**: `ruff format .`
- **Test all**: `pytest`
- **Test single**: `pytest tests/test_module.py::test_function`

## Code Style

- **Python**: the `requires-python` version in `pyproject.toml`, which follows Home Assistant
- **Formatting**: 4-space indentation, Ruff formatter, 88 char line length
- **Imports**: sorted by Ruff, group first-party imports
- **Types**: Use type hints, prefer `|` union syntax, dataclasses with slots
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **Error handling**: Use specific exceptions, avoid bare except clauses
- **Docstrings**: Google-style, present tense
- **Testing**: Use pytest with syrupy for snapshots
