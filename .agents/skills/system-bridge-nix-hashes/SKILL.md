---
name: system-bridge-nix-hashes
description: Keep the System Bridge Nix package's dependency hashes current. Use whenever a change adds, removes or updates a Go or Bun dependency (go.mod, go.sum, bun.lock or a package.json), or when the Nix workflow fails with a hash mismatch.
---

# System Bridge Nix Hashes

`nix/package.nix` pins two hashes: `vendorHash` follows `go.mod` and `go.sum`, and the web client modules' `outputHash` follows `bun.lock`. A dependency change that reaches `dev` without new hashes fails the Nix workflow.

## After every dependency change

A `post-commit` hook handles it: after a commit that touches `go.mod`, `go.sum`, `bun.lock` or a `package.json`, it refreshes the hashes and commits `nix/package.nix` as "Update Nix dependency hashes". Commit as usual with `dot git commit`, then check that commit is there before pushing.

- The hook needs installing once per checkout: `mise run install:hooks`, which has mise generate it to run the hidden `nix:post-commit` task.
- Without Nix installed, the script runs Nix in Docker. When the user can't reach the Docker socket, it runs Docker through `pkexec`, so expect an authorisation prompt for each build attempt (up to three). Don't suggest adding the user to the `docker` group. The first run fetches a few hundred MB into the `system-bridge-nix` volume; later runs are quicker.
- When the hook can't refresh the hashes it says so and leaves the commit alone. Run `mise run nix:hashes`, then commit `nix/package.nix` on its own.
- It skips commits replayed by a rebase, and leaves `nix/package.nix` alone when it already has uncommitted edits.

## Renovate

Renovate's pull requests are covered by `.github/workflows/nix.yml`, which refreshes the hashes on `renovate/` branches and pushes them to the pull request. Nothing to do locally.

## A failing Nix workflow on dev

The failed run's log prints the new hash after `got:`. Put it in `nix/package.nix` in place of the one after `specified:`, or run `mise run nix:hashes`.
