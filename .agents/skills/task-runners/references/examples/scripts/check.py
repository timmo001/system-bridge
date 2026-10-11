#!/usr/bin/env python3
"""Run independent checks in parallel, label their output, and report every failure.

Standard library only, so it runs before the environment is synced:

    uv sync --locked
    python3 scripts/check.py

Each command uses `--no-sync` so parallel `uv run` calls don't each sync `.venv`.
"""

import asyncio
import sys

CHECKS = {
    "lint": "uv run --no-sync ruff check",
    "typecheck": "uv run --no-sync mypy src",
    "test": "uv run --no-sync pytest -n auto",
    # ...
}


async def run(name: str, command: str) -> bool:
    process = await asyncio.create_subprocess_shell(
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert process.stdout is not None
    async for line in process.stdout:
        print(f"[{name}] {line.decode().rstrip()}", flush=True)
    return await process.wait() == 0


async def main() -> int:
    results = await asyncio.gather(*(run(n, c) for n, c in CHECKS.items()))
    failed = [name for name, ok in zip(CHECKS, results) if not ok]
    if failed:
        print(f"Failed: {', '.join(failed)}", file=sys.stderr)
        return 1
    return 0


sys.exit(asyncio.run(main()))
