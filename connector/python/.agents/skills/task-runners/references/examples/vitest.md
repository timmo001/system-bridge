# Vitest examples

## Quick start

```sh
vitest run                         # whole suite; files already run in parallel workers
vitest run --changed               # files affected by uncommitted changes
vitest related src/parse.ts --run  # tests that import a file
```

Don't wrap Vitest in a parallel runner; it already uses the cores.

## Projects

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["src/**/*.test.ts"], environment: "node" } },
      { test: { name: "dom", include: ["src/**/*.dom.test.ts"], environment: "happy-dom" } },
    ],
  },
});
```

- Projects share one process and worker pool, so one `vitest run` covers both.
- Give each project only the environment it needs; a DOM environment for logic tests is wasted start-up.
- Leave `isolate` on unless the suite is known to be free of shared module state.

## More options

```sh
vitest run --project unit          # one project
vitest run --changed origin/main   # affected since a branch
vitest run --shard=1/3             # one of three CI jobs
vitest run --bail=1                # stop at the first failure
```

To combine sharded reports, run each shard with `--reporter=blob`, then `vitest --merge-reports`.
