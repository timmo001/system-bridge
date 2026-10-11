# Python (uv) examples

uv can't run tasks in parallel natively. To run checks in parallel, use an alternative task runner, such as make, just, mise, nox, tox or poethepoet, or write your own script. uv installs fast, so the slow parts are the type checker and the tests.

## Quick start

```sh
uv sync --locked
python3 scripts/check.py
```

[scripts/check.py](scripts/check.py) runs ruff, mypy and pytest side by side and reports every failure. It uses only the standard library, and each command uses `uv run --no-sync` so they don't all sync the same `.venv`.

## Notes

- `pytest -n auto` needs `pytest-xdist` in the dev group; without it tests run one at a time.
- Tests that share a database, port or temp directory need per-worker values first. xdist sets `PYTEST_XDIST_WORKER` (`gw0`, `gw1`, ...).
- `ruff format` writes files: run it before the checks, and use `ruff format --check` as a check.

```sh
uv run --no-sync pytest --lf                 # rerun last failures
uv run --no-sync pytest tests/test_parse.py -k empty
uv run --with pytest-xdist pytest -n auto    # try xdist without adding it
```
