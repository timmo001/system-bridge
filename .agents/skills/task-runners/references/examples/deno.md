# Deno examples

## Quick start

```json
{
  "tasks": {
    "lint": "deno lint",
    "typecheck": "deno check",
    "test": "deno test --parallel",
    "check": { "dependencies": ["lint", "typecheck", "test"] }
  }
}
```

```sh
deno task check
deno task "lint*"   # wildcard: lint and any lint:* task
```

A task with `dependencies` and no `command` is a group: its dependencies run in parallel.

## Fuller example

```jsonc
{
  "tasks": {
    "generate": {
      "command": "deno run -RW scripts/generate_types.ts",
      "files": ["schema/*.json", "scripts/generate_types.ts"],
      "output": ["src/generated/"]
    },
    "format": "deno fmt",
    "lint": { "command": "deno lint", "dependencies": ["generate"] },
    "lint:format": "deno fmt --check",
    "typecheck": { "command": "deno check", "dependencies": ["generate"] },
    "test:unit": { "command": "deno test --parallel src/", "dependencies": ["generate"] },
    "test:e2e": "deno test -A --parallel e2e/",
    "build": {
      "command": "deno compile -A -o dist/app main.ts",
      "dependencies": ["generate"],
      "files": ["src/**/*.ts", "main.ts", "deno.json", "deno.lock"],
      "output": ["dist/app"]
    },
    "check": {
      "dependencies": ["lint", "lint:format", "typecheck", "test:unit", "build"]
    }
  }
}
```

- `generate` runs once even though four tasks need it.
- `files` makes a task skip while its command and inputs are unchanged; `output` is restored from the cache if deleted.
- `format` writes files, so it stays out of `check`.
- When one dependency fails, the others still finish before the task fails.

```sh
deno task "test:*(!e2e)"          # every test task except e2e
deno task --jobs 2 check          # cap concurrency (or DENO_JOBS)
deno test --changed               # tests affected by uncommitted changes
deno test --related src/parse.ts  # tests that import a file
```

Quote wildcard patterns so the shell doesn't expand them.

## Workspaces

```sh
deno task --recursive check
deno task --filter "@scope/client" build
```

## Traps

- `**` in a task command also walks `node_modules`. Use `exclude` in `deno.json` instead of globs.
- `&` in a command runs things together, but the first failure kills the rest. Use `dependencies`.
