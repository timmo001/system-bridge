# pnpm examples

## Quick start

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "pnpm run --no-bail \"/^(lint|typecheck|test)$/\""
  }
}
```

```sh
pnpm run check
pnpm run "/^(lint|typecheck)$/"   # only what a change needs
```

- `pnpm run a b` does **not** run two scripts: it runs `a` with `b` as an argument. Use a quoted regex (pnpm 12.2+).
- Anchor it with `^...$`. `/^lint/` would also match `lint:licenses` or `lint:types:app`.
- `--no-bail` lets every script finish, then lists the failures. Without it, the first failure cancels the rest.

## Fuller example

```json
{
  "scripts": {
    "generate": "node scripts/generate-types.mjs",
    "format": "prettier . --write",
    "lint:eslint": "eslint . --max-warnings=0",
    "lint:prettier": "prettier . --check",
    "lint:types": "tsc --noEmit",
    "test": "vitest run",
    "lint": "pnpm run --no-bail \"/^lint:(eslint|prettier|types)$/\"",
    "check": "pnpm run generate && pnpm run --no-bail \"/^(lint|test)$/\""
  }
}
```

- `check` reuses `lint` rather than repeating its list. `generate` runs first because the checks read it.
- `format` writes files, so it stays out of `check`.
- Matched scripts start in alphabetical order, then overlap. For real ordering use `&&` or workspace `tasks`.

```sh
pnpm run --workspace-concurrency=2 lint   # cap memory-hungry checks
pnpm run -s "/^lint:/"                     # one at a time, for debugging
```

## Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - packages/*

tasks:
  build:
    dependsOn:
      - ^build        # build workspace dependencies first
  test:
    dependsOn:
      - build         # this package's build before its tests
  lint:
    dependsOn: []     # independent of every other package
```

```sh
pnpm -r run test                            # builds what tests need, in graph order
pnpm -r run --no-bail lint                  # every package, keep going on failure
pnpm -r run --dry-run test                  # print the task graph
pnpm --filter "...[origin/main]" run test   # changed packages and their dependents
pnpm --filter "@scope/app..." run build     # one package and its dependencies
```

- `--parallel` and `--no-sort` ignore the graph. Keep them for dev servers.
- Configuring a task replaces its default `^<script>` dependency, so spell out `^build` if you still want it.
- Keep one script per job in each package. A package-level `check` that chains everything hides the work from the scheduler.
