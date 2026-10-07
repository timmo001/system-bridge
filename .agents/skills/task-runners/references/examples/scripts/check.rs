// Run independent checks in parallel, label their output, and report every failure.
//
// As a cargo xtask: put this in xtask/src/main.rs (a binary crate in the
// workspace) and add an alias so `cargo xtask` runs it:
//
//   # .cargo/config.toml
//   [alias]
//   xtask = "run --quiet --package xtask --"
//
// clippy, test and build share target/ and queue on its lock, so running them
// side by side gains little. Overlap them with checks that don't build.
use std::io::{BufRead, BufReader};
use std::process::{exit, Command, Stdio};
use std::thread;

const CHECKS: &[(&str, &str)] = &[
    ("fmt", "cargo fmt --check"),
    (
        "clippy",
        "cargo clippy --all-targets --locked -- -D warnings",
    ),
    ("deny", "cargo deny check"),
    // ...
];

fn run(name: &str, command: &str) -> bool {
    let Ok(mut child) = Command::new("sh")
        .args(["-c", &format!("{command} 2>&1")])
        .stdout(Stdio::piped())
        .spawn()
    else {
        println!("[{name}] failed to start");
        return false;
    };
    let output = child.stdout.take().expect("stdout is piped");
    for line in BufReader::new(output).lines().map_while(Result::ok) {
        println!("[{name}] {line}");
    }
    child.wait().is_ok_and(|status| status.success())
}

fn main() {
    let handles: Vec<_> = CHECKS
        .iter()
        .map(|&(name, command)| thread::spawn(move || (name, run(name, command))))
        .collect();

    let failed: Vec<&str> = handles
        .into_iter()
        .map(|handle| handle.join().expect("check thread panicked"))
        .filter(|&(_, ok)| !ok)
        .map(|(name, _)| name)
        .collect();

    if !failed.is_empty() {
        eprintln!("Failed: {}", failed.join(", "));
        exit(1);
    }
}
