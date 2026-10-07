---
name: task-runners
license: Apache-2.0
description: Run and write project tasks so checks, builds, tests and dev servers finish fast - run only what a change needs, in parallel, skipping work that is already up to date. Use when running linters, type checks, test suites or builds; when writing or reviewing task runner config (mise.toml, package.json scripts, justfile, deno.json, Makefile, pitchfork.toml) or CI steps; or when a check, build or task run is slow.
---

# Task Runners

Fast runs come from three things, in this order: run less, run it at the same time, and skip what is already done. The `testing` skill decides which checks a change needs; this skill covers running and writing them efficiently. Per-tool commands are in [references/tools.md](references/tools.md); read it before running or editing a tool's tasks.

## Running

1. **Find the tasks.** List them first (`mise tasks`, `just --list`, `deno task`, the `scripts` in `package.json`). Prefer a repository's own task over the raw command it wraps, since the task carries the right flags, directory and dependencies. Local `AGENTS.md` instructions win.
2. **Pick the narrowest tasks.** Map the changed files to the tasks that cover them: a YAML edit needs the YAML linter, not the test suite. Use a tool's changed-file selection where it exists (`bun test --changed`, `deno test --changed`, pnpm `--filter "...[origin/main]"`, `mise run --affected`). Don't run a repository-wide aggregate such as `check` or `validate` for a narrow change.
3. **Run them together.** Pass independent tasks to one invocation (`mise run a ::: b`, `bun run --parallel a b`, `pnpm run a b`), or start separate commands as parallel tool calls. Never chain independent checks with `&&`.
4. **Write first, then check.** Formatters, code generators and anything else that rewrites files run on their own before the read-only checks, so the checks see the final files.
5. **Background long runs.** Start slow builds and full suites in a background shell and keep working; start dev servers through the project's daemon workflow rather than in the foreground.
6. **Rerun narrowly.** After a failure, rerun only what failed (`pytest --lf`, a single task, a single test file) and widen again only when the fix could affect more.

## Writing tasks

- **One job per task.** Give each check its own task (`lint`, `lint:yaml`, `typecheck`, `test`), then group them in an aggregate task through dependencies. A `run` string chained with `&&` forces everything to run one after another and hides which step failed.
- **Declare real ordering as dependencies.** If tests need a build, the test task depends on the build task; the runner then builds once even when several tasks need it. Don't rely on the order tasks are listed in, and don't use lifecycle hooks (`pretest`) that rebuild behind the runner's back.
- **Install before anything reads dependencies.** Tasks that read `node_modules`, a virtualenv or a vendor directory depend on the install task, so a parallel install cannot run while they read.
- **Keep writers away from readers.** Two tasks that write the same file or directory must not run in parallel: a formatter and its own `--check`, two builds sharing an output, or a code generator and the linter reading its output. Separate them with a dependency or a wait (`wait_for` in mise) rather than serialising everything.
- **Skip up-to-date work.** Declare inputs and outputs (`sources`/`outputs` in mise, `files`/`output` in deno tasks) on slow tasks with clear inputs, such as builds and generators. Include config and lockfiles in the inputs. Leave cheap checks uncached.
- **Use the tool's own parallelism.** Test runners and build tools usually parallelise internally; don't split their work into many tasks unless the pieces need isolation. Turn it on where it is opt-in (`bun test --parallel`, `deno test --parallel`, `pytest -n auto`).
- **Isolate shared state.** Parallel tasks and tests need their own ports, temporary directories, databases and lock files. Fix collisions with per-task paths or random ports; serialise only the tasks that genuinely share a resource.
- **Name for grouping.** Use `group:name` task names (`lint:yaml`, `test:unit`) so wildcards and aggregates can pick them up, and give each task a short description.
- **Mirror tasks in CI.** CI calls the same tasks, and independent checks run as separate jobs or in one parallel task invocation, not as a long chain of steps.

## Measuring

Measure before and after a task change: the runner's own timings (mise prints them per task), or `hyperfine` for repeated runs. Keep the change only if it is faster without making failures harder to read.
