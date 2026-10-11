# Bun examples

## Quick start

```json
{
  "scripts": {
    "lint": "oxlint",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "check": "bun run --parallel --no-exit-on-error lint typecheck test"
  }
}
```

```sh
bun run check
bun run --parallel lint typecheck   # only what a change needs
```

`--no-exit-on-error` lets every script finish so you see every failure; the run still exits non-zero.

## Fuller example

```json
{
  "scripts": {
    "generate": "bun run scripts/generate-types.ts",
    "format": "prettier . --write",
    "lint": "oxlint",
    "lint:format": "prettier . --check",
    "typecheck": "tsc --noEmit",
    "test": "bun test --parallel",
    "build": "bun build src/index.ts --compile --outfile dist/app",
    "check": "bun run generate && bun run --parallel --no-exit-on-error lint lint:format typecheck test build"
  }
}
```

- The one `&&` is a real ordering: the checks read `generate`'s output.
- `format` writes files, so it stays out of `check`.
- Skip `pretest`/`prebuild` hooks. Bun runs them on every `bun run <script>`, repeating work the aggregate already ordered.
- Output is prefixed with each script's name. `--sequential` gives the same output one script at a time.

## Tests

```sh
bun test --changed                                 # affected by uncommitted changes
bun test --changed=origin/main                     # affected since a branch
bun test --shard=1/3 --timings=.bun-timings.json   # one of three CI jobs
```

`--parallel` implies `--isolate`. Tests that share ports, temp directories or databases need per-file values first.

## Workspaces

```sh
bun run --filter '*' build
bun run --filter './packages/*' test
bun run --workspaces lint
```
