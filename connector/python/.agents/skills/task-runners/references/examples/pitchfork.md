# pitchfork examples

For long-running local services (dev servers, databases). One-shot checks belong in the task runner.

## Quick start

```toml
# pitchfork.toml
[daemons.web]
run = "exec bunx vite --port $PORT --strictPort"
port = { expect = [5173], bump = true }
ready_cmd = "curl -fsS http://localhost:$PORT/ >/dev/null"
```

```sh
pitchfork start web   # returns once it's ready
pitchfork logs web
pitchfork stop web
```

- `port` with `bump` moves to a free port if 5173 is taken; the command reads it from `$PORT`.
- `ready_cmd` returns as soon as the server answers. Without a readiness check, pitchfork waits a fixed delay.
- `exec` makes the tracked PID the server, not the wrapping shell.

## A stack with dependencies

```toml
[daemons.postgres]
run = "exec postgres -D .data/postgres -p $PORT"
port = { expect = [5432], bump = true }
ready_cmd = "pg_isready -h localhost -p $PORT"

[daemons.migrate]
run = "bun run db:migrate"
oneshot = true
depends = ["postgres"]
env = { DATABASE_PORT = "{{ daemons.postgres.port }}" }

[daemons.api]
run = "exec bun run --watch src/server.ts"
port = { expect = [3000], bump = true }
ready_cmd = "curl -fsS http://localhost:$PORT/health"
depends = ["migrate"]
mise = true

[groups.default]
daemons = ["api"]
```

```sh
pitchfork start --group default
pitchfork status api
```

- `depends` starts dependencies first, independent ones in parallel.
- `oneshot = true` must exit 0 before dependents start. It can't have `ready_*` checks.
- Templates such as `{{ daemons.postgres.port }}` can only reference dependencies, not the daemon itself. Use `$PORT` for its own port.
- `mise = true` runs the daemon under `mise x`, so it sees the project's pinned tools.

## From mise

```toml
[tasks."test:e2e"]
daemons = ["api"]     # experimental: mise starts them through pitchfork first
run = "playwright test"
```

Check the project's `AGENTS.md` first. Run servers in the foreground under pitchfork; a server that detaches itself, such as `astro dev` under an agent, needs its opt-out (`--ignore-lock` for Astro) or pitchfork loses track of it.
