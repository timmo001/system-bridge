# just examples

## Quick start

```just
[parallel]
check: lint typecheck test

lint:
    cargo clippy --all-targets -- -D warnings

typecheck:
    cargo check --all-targets

test:
    cargo test
```

```sh
just check
```

`[parallel]` runs the recipe's dependencies at the same time. Without it they run one after another.

## Fuller example

```just
# Run every check in parallel
[parallel]
check: lint lint-format typecheck test build

# Format files in place
format:
    cargo fmt

generate:
    ./scripts/generate.sh

lint: generate
    cargo clippy --all-targets -- -D warnings

lint-format:
    cargo fmt --check

typecheck: generate
    cargo check --all-targets

test: generate
    cargo test

build: generate
    cargo build --release
```

- A recipe runs once per invocation, so `generate` runs once.
- When one parallel recipe fails, the others finish, then `just` exits non-zero.
- `format` writes files, so it stays out of `check`.
- Lines in a recipe run in order and stop at the first failure. Split independent commands into separate recipes.

```sh
just --jobs 2 check   # cap parallel recipes
just -n check         # dry run
just --list           # recipes and their doc comments
```

## Caching

just doesn't skip up-to-date work in its stable features. Recipe caching (`[cache(...)]`, 1.54+) is unstable and needs `set unstable` and `[script]` recipes. For slow steps, rely on a tool that caches (cargo, mise `sources`/`outputs`, make).
