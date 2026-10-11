# Yarn examples

Yarn 4 runs workspaces in parallel with `yarn workspaces foreach`. Within one package it can't run scripts in parallel natively; use an alternative task runner or write your own script (see [npm.md](npm.md)).

## Quick start

```json
{
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "yarn workspaces foreach -Apt run build",
    "lint": "yarn workspaces foreach -Ap run lint"
  }
}
```

```sh
yarn build   # every workspace, dependencies first
yarn lint    # every workspace, all at once
```

`-A` every workspace, `-p` in parallel, `-t` after the workspaces it depends on. Use `-t` when a script reads a dependency's build output; leave it off for independent checks so nothing waits.

## More options

```sh
yarn workspaces foreach -Apiv run lint                       # live output, prefixed by workspace
yarn workspaces foreach -Apt --since=origin/main run test    # only changed workspaces
yarn workspaces foreach -Rpt --from '@scope/app' run build   # one workspace and its dependencies
yarn workspaces foreach -Apt -j 2 run test                   # cap concurrency
yarn workspaces foreach -Apt -n run build                    # dry run
```

- Use `--topological-dev` instead of `-t` when the ordering comes through `devDependencies`.
- Workspaces without the script are skipped.
- After a failure, scripts already running still finish, then the command exits non-zero.
- Parallel runs default to about half the cores; change it with `-j`.
- Without `-i`, output is buffered per workspace, which reads better in CI.
