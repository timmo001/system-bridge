# Rust (cargo) examples

cargo can't run tasks in parallel natively. To run checks in parallel, use an alternative task runner, such as just, cargo-make, make or mise, or write your own script. Within one command, cargo already compiles crates in parallel and skips up-to-date work.

## Quick start

```sh
cargo fmt                                              # writes files; run first
cargo clippy --all-targets --locked -- -D warnings
cargo test --locked
```

Run them in that order. clippy and test share `target/` and queue on its lock, so starting them together gains little; each reuses what the last one compiled.

## A check command

To get one `cargo xtask check` command, use [scripts/check.rs](scripts/check.rs) as `xtask/src/main.rs`. It can overlap the build with checks that don't compile, such as `cargo fmt --check` or `cargo deny`.

## Notes

- Keep flags, features and `RUSTFLAGS` the same across clippy, test and build. A difference rebuilds every dependency.
- `cargo nextest run` runs tests in parallel processes and is usually faster than `cargo test` on larger suites.
- `cargo build --workspace` schedules every crate in one graph. Don't run cargo once per crate in parallel.

```sh
cargo test -p my-crate                      # one workspace crate
cargo test parse::                          # tests whose path matches
cargo nextest run --partition count:1/3     # one of three CI jobs
```

In CI, cache `~/.cargo/registry`, `~/.cargo/git` and `target/` keyed on `Cargo.lock` and the toolchain (`Swatinem/rust-cache`).
