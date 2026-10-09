# mise examples

## Quick start

```toml
[tasks.lint]
run = "bunx oxlint"

[tasks.typecheck]
run = "bunx tsc --noEmit"

[tasks.test]
run = "bun test"

[tasks.check]
depends = ["lint", "typecheck", "test"]
```

```sh
mise run check                  # lint, typecheck and test at the same time
mise run lint ::: typecheck     # only what a change needs
```

A task with only `depends` is a group: its dependencies start together.

## Fuller example

```toml
[tasks.install]
run = "bun install --frozen-lockfile"
sources = ["package.json", "bun.lock"]

[tasks.generate]
depends = ["install"]
run = "bun run scripts/generate-types.ts"
sources = ["schema/*.json", "scripts/generate-types.ts"]
outputs = ["src/generated/types.ts"]

[tasks.format]
depends = ["install"]
run = "bunx prettier . --write"

[tasks."lint:ts"]
depends = ["install", "generate"]
run = "bunx oxlint"

[tasks."lint:yaml"]
run = "yamllint ."

[tasks.typecheck]
depends = ["install", "generate"]
run = "bunx tsc --noEmit"

[tasks.test]
depends = ["install", "generate"]
run = "bun test --parallel"

[tasks.build]
depends = ["install", "generate"]
run = "bun build src/index.ts --compile --outfile dist/app"
sources = ["src/**/*.ts", "package.json", "bun.lock", "tsconfig.json"]
outputs = ["dist/app"]

[tasks.lint]
depends = ["lint:*"]

[tasks.check]
depends = ["lint", "typecheck", "test", "build"]
```

- Shared dependencies run once: `install` and `generate` run first, then every check starts together.
- `lint:*` picks up every linter, so a new one joins the aggregate on its own.
- `sources`/`outputs` skip up-to-date work on the next run. With only `sources`, mise records when the task last ran.
- `format` writes files, so it stays out of `check`. Run it first.
- `lint:yaml` reads no packages, so it doesn't wait for `install`.

```sh
mise run -c check          # keep going and report every failure
mise run -n check          # show what would run
mise tasks deps check      # print the dependency tree
```

## Parallel step inside one task

```toml
[tasks.release]
run = [
  { task = "build" },
  { tasks = ["publish:npm", "publish:jsr"] },
]
```

## Waiting without depending

```toml
[tasks."lint:ts"]
wait_for = ["generate"]   # wait if generate is in this run, but don't pull it in
run = "bunx oxlint"
```

## Traps

- In YAML, quote `mise run a ::: b`, or it is read as a mapping.
- Tasks don't get `node_modules/.bin` on `PATH`. Use `bunx`/`pnpm exec`, or set `[env] _.path = ["{{config_root}}/node_modules/.bin"]`.
- A task's `env` is not passed to its dependencies.
