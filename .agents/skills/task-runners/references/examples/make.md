# make examples

## Quick start

```make
MAKEFLAGS += -j$(shell nproc) --output-sync=target

.PHONY: check lint typecheck test

check: lint typecheck test

lint:
	eslint .

typecheck:
	tsc --noEmit

test:
	vitest run
```

```sh
make check
make -k check   # keep going after a failure
```

`-j` in `MAKEFLAGS` runs independent targets in parallel; `--output-sync=target` keeps each target's output together. Recipe lines indent with a tab.

## Fuller example

```make
MAKEFLAGS += -j$(shell nproc) --output-sync=target

.PHONY: check format lint lint-format typecheck test

SOURCES := $(shell find src -name '*.ts')

check: lint lint-format typecheck test dist/app

format:
	prettier . --write

# Rebuilt only when the schema or generator changes
src/generated/types.ts: schema/api.json scripts/generate-types.ts
	node scripts/generate-types.ts

lint: src/generated/types.ts
	eslint .

lint-format:
	prettier . --check

typecheck: src/generated/types.ts
	tsc --noEmit

test: src/generated/types.ts
	vitest run

# Rebuilt only when a source, the lockfile or config changes
dist/app: $(SOURCES) src/generated/types.ts package.json pnpm-lock.yaml tsconfig.json
	bun build src/index.ts --compile --outfile $@
```

- Task-like targets are `.PHONY` so make never mistakes them for files.
- File targets list their inputs, so make skips them while the output is newer.
- The generated file is built once, before the checks that need it.
- `format` writes files, so it stays out of `check`.

```sh
make -n check   # dry run
```

## Traps

- A missing prerequisite is a race under `-j`: it works serially by luck and fails in parallel. Declare it rather than dropping `-j`.
- Two targets that write the same file must depend on each other.
- Call sub-makes with `$(MAKE) -C dir`, not `make`, so they share the job server.
