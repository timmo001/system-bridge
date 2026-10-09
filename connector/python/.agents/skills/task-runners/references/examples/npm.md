# npm examples

npm can't run scripts in parallel natively. To run checks in parallel, use an alternative task runner or write your own script. The quick start uses a script, since it needs no new dependency.

## Quick start

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "node --test",
    "check": "node scripts/check.mts"
  }
}
```

```sh
npm run check
```

[`scripts/check.mts`](scripts/check.mts) starts every check at once, labels each line of output, and reports all the failures at the end. [`scripts/check.sh`](scripts/check.sh) does the same in Bash.

## Ordering

```json
"check": "npm run generate && node scripts/check.mts"
```

- Run anything the checks read, such as generated code, first. Keep formatters out of `check`, since they rewrite files.
- Don't use `pre`/`post` hooks for ordering; npm reruns them on every `npm run <script>`.
- Don't use a bare `&` in a script. A background job that fails doesn't fail the script.

## Alternative task runners

### npm-run-all2

Runs scripts in parallel (`run-p`) or in order (`run-s`), selected by name pattern.

```json
"check": "run-p --continue-on-error --print-label \"lint:*\" typecheck test"
```

`"lint:*"` matches one level and `"lint:**"` deeper names. Without `--continue-on-error`, the first failure stops the rest.

### concurrently

Runs scripts in parallel with named, coloured output. It's also a common way to start dev servers side by side.

```json
"check": "concurrently -g \"npm:lint:*\" npm:typecheck npm:test"
```

After a failure, the other scripts keep running and the command exits non-zero. `-g` groups each script's output; `--kill-others-on-fail` stops early.

### wireit

Adds dependencies and caching to `package.json` scripts.

```json
{
  "scripts": {
    "generate": "wireit",
    "lint": "wireit",
    "test": "wireit",
    "check": "wireit"
  },
  "wireit": {
    "generate": {
      "command": "node scripts/generate-types.mjs",
      "files": ["schema/*.json", "scripts/generate-types.mjs"],
      "output": ["src/generated/**"]
    },
    "lint": {
      "command": "eslint .",
      "dependencies": ["generate"],
      "files": ["src/**", "eslint.config.js"],
      "output": []
    },
    "test": {
      "command": "node --test",
      "dependencies": ["generate"]
    },
    "check": {
      "dependencies": ["lint", "test"]
    }
  }
}
```

Dependencies run in parallel, and a shared one runs once. A script with `files` and `output` is skipped while its inputs are unchanged.

### General task runners

mise, just and make sit outside `package.json` and work across languages. See [mise.md](mise.md), [just.md](just.md) and [make.md](make.md).

## Workspaces

```sh
npm run build --workspaces --if-present   # every package, one at a time
npm run test -w packages/app              # one package
```

To run packages in parallel and in dependency order, use Turborepo, Nx, wireit or mise.

`node --run <script>` (Node 22+) starts faster than `npm run` and skips hooks, but still runs only one script.
