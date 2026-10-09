# GitHub Actions examples

## Quick start

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: jdx/mise-action@v5
      - run: "mise run -c lint ::: typecheck ::: test ::: build"
```

- One job, same tasks as local runs, all in parallel.
- Quote the `run:` value: unquoted `:::` is read as a YAML mapping.
- `-c` lets every task finish so one run shows every failure.

## Separate jobs

Use when checks are slow, need different runners, or should be separate required statuses.

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: jdx/mise-action@v5
      - run: mise run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard:
          - 1
          - 2
          - 3
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: jdx/mise-action@v5
      - run: mise run test -- --shard=${{ matrix.shard }}/3
```

- Jobs without `needs` start together. A `build` that `needs: [lint]` adds lint's time to every run; only add `needs` for real ordering, such as deploy after build.
- Don't run the same check twice (a reusable lint workflow and a `check` task that also lints).
- `fail-fast: false` keeps the other shards running when one fails.

## Skipping unaffected work

```yaml
on:
  pull_request:
    paths:
      - "src/**"
      - "package.json"
      - "bun.lock"
      - ".github/workflows/ci.yml"
  push:
    branches:
      - main
```

Keep the full run on the default branch. If a skipped workflow provides a required check, the pull request waits forever; use a job-level filter (such as `dorny/paths-filter`) that reports success instead.

## Caching and concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- Cancel superseded runs on the same branch.
- Cache package stores on the lockfile: `actions/setup-node` with `cache:`, `astral-sh/setup-uv` with `enable-cache: true`, `Swatinem/rust-cache`. `jdx/mise-action` caches tool installs.
- Pin actions to a commit SHA in real workflows; tags are shown for readability.
