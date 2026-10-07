# Tool Reference

Commands and config for running and writing fast tasks with each tool. Check `--help` for the installed version before relying on a flag; these were checked against mise 2026.10, Bun 1.4, pnpm 12, Yarn 4, Deno 2.9, just 1.58 and pitchfork 2.29.

## mise

Running:

- `mise run a ::: b ::: c` runs several tasks at once, each with its own arguments after the task name.
- Dependencies run in parallel, up to `--jobs` (`-j`, default 8). A dependency shared by several tasks runs once per invocation.
- `mise run --affected` runs tasks only for monorepo projects changed in Git (`--affected-base <rev>` to compare against a branch).
- `mise run -c` keeps going after a failure so one run reports every failing task.
- `mise tasks deps <task>` prints the dependency tree; `mise run -n <task>` shows what would run.

Writing:

```toml
[tasks.check]
description = "Run every check in parallel"
depends = ["lint", "typecheck", "test"]

[tasks.test]
depends = ["build"]          # build runs once, before test
run = "vitest run"

[tasks.build]
depends = ["install"]
run = "bun run build"
sources = ["src/**/*.ts", "package.json", "bun.lock"]
outputs = ["dist/app"]       # skipped while dist/app is newer than every source

[tasks.lint]
wait_for = ["generate"]      # wait for generate only if it is already running
run = "oxlint"

[tasks.release]
run = [
  { task = "build" },
  { tasks = ["publish:npm", "publish:jsr"] },  # parallel step inside one task
]
```

- A task with only `depends` is a group; prefer it to a `run` string that chains tasks with `&&`.
- `sources` plus `outputs` skips a task whose outputs are newer than its sources. With `sources` alone, `outputs` defaults to `{ auto = true }`.
- Tasks run through a shell without `node_modules/.bin` on `PATH`. Call package binaries through the package manager (`bunx`, `pnpm exec`) or add `[env] _.path = ["{{config_root}}/node_modules/.bin"]`.
- `env` on a task is not passed to its `depends`; pass it per dependency (`depends = [{ task = "setup", env = { CI = "1" } }]`).

## Bun

- `bun run --parallel a b` runs several `package.json` scripts at once; `--sequential` runs them in order with the same prefixed output; `--no-exit-on-error` keeps going after a failure.
- `bun run --filter '<pattern>' <script>` or `--workspaces` runs a script across workspace packages.
- `bun test` runs files in one process by default. `--parallel[=N]` uses worker processes (one per core by default, implies `--isolate`); `--changed[=<ref>]` runs only files affected by Git changes; `--shard=1/3` with `--timings` splits suites across CI jobs.
- `pre<script>` lifecycle hooks run on every `bun run <script>`; a task runner that already orders the build will build twice, possibly in parallel. Call the underlying command from the task instead.

## pnpm

- `pnpm run a b` runs several scripts concurrently; `-s` runs them one by one.
- `pnpm -r run <script>` runs across the workspace in dependency order; add `--parallel` to ignore ordering for independent scripts such as lint or dev servers, and `--workspace-concurrency <n>` to cap it.
- `--filter "...[origin/main]"` selects packages changed since a ref plus their dependents; `--filter "<pkg>..."` selects a package and its dependencies.

## npm and Yarn

- `npm run` takes one script and `--workspaces` runs one package at a time. Put parallel orchestration in mise or another runner rather than `&` chains in scripts.
- Yarn 4: `yarn workspaces foreach -Apt run build` runs across all workspaces in parallel (`-p`), dependencies first (`-t`); `--since[=<ref>]` limits to changed workspaces; `-j` caps concurrency.

## Deno

- A task's `dependencies` run in parallel (up to `--jobs`/`DENO_JOBS`, default CPU count) and shared dependencies run once. A task with `dependencies` and no `command` is a group.
- `deno task "build:*"` runs every matching task in parallel; `"test:*(!e2e)"` excludes some.
- Adding `files` (inputs), `output` and `env` to a task caches its result and skips it while the inputs are unchanged.
- `deno test --parallel` runs modules in parallel; `--changed[=<ref>]` and `--related <file>` select affected tests.

## just

- Put `[parallel]` on a recipe to run its dependencies at the same time; `--jobs` caps how many.
- Recipe lines run one after another; split independent work into separate recipes rather than one long recipe.

## make

- `make -j"$(nproc)"` builds independent targets in parallel; it is only safe when every target lists its real prerequisites.
- Mark task-like targets `.PHONY` and file targets with their inputs so up-to-date targets are skipped.

## Rust, Go and Python

- `cargo build` and `cargo test` already use every core; don't wrap them in extra parallelism. Reuse the build between check, test and run tasks by sharing the target directory and profile.
- `go test ./...` runs packages in parallel (`-p`, default `GOMAXPROCS`) and caches passing results; `t.Parallel()` opts individual tests in. Don't pass `-count=1` unless you need to bypass the cache.
- pytest runs serially by default. With pytest-xdist installed, `pytest -n auto` spreads tests across workers (`uv run --with pytest-xdist pytest -n auto` without adding a dependency). `pytest --lf` reruns only the last failures.

## Vitest

- Runs test files in parallel workers by default; `vitest run --changed` limits to files affected by uncommitted changes and `vitest related <files>` to tests importing given files.

## Dev servers and daemons (pitchfork)

- `pitchfork start api worker` starts several daemons in one call and waits for each to be ready; `--group <name>` starts a named group, and `-l` every daemon in the local `pitchfork.toml`.
- Readiness flags (`--port`, `--http`, `--output`) let the call return as soon as the server is usable instead of after a fixed delay.
- With mise's experimental `daemons` support, a task declares the daemons it needs (`daemons = ["postgres"]`) and mise starts them through pitchfork before the task runs.

## CI (GitHub Actions)

- Jobs without `needs` run in parallel; give independent checks their own jobs or one job that runs a parallel aggregate task.
- Cache the package manager store keyed on the lockfile, and tool installs (`jdx/mise-action` caches mise's).
- Use path filters or changed-file selection to skip suites a change cannot affect, and keep a full run on the default branch.
