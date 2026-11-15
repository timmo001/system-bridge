---
name: system-bridge
description: Read and control a computer through System Bridge from an agent. Use when asked about this machine's CPU, memory, disks, processes, sensors, media, audio, displays or Hyprland windows, or to control windows, media, audio, Bluetooth, the clipboard, notifications or power through the running System Bridge backend.
---

# System Bridge

Prefer the `system-bridge` Code Mode namespace, then the MCP server; fall back to the CLI.

1. Code Mode: the OpenCode plugin in `opencode-plugin/` registers every tool from `system-bridge agent tools --json` as `tools["system-bridge"]`. The manifest says whether this machine has a backend to call (`available`) and marks each tool `read` or `write`.
2. MCP: the backend serves the same tools at `http://127.0.0.1:9170/api/mcp`, with a key as a bearer token. Make one with `system-bridge client key create "<agent name>"`; it's printed once.
3. CLI: `system-bridge agent call <tool>` takes the tool's input as JSON on stdin and prints its result as JSON. Other `system-bridge client ...` commands take `--json` where they return data.

Read with `get_data` (one or more modules) or `get_history` before changing anything. Tools that write, such as `run_command`, `kill_process`, `lock` and the power and Hyprland tools, change the live desktop: say what you're about to do and ask first when the user hasn't asked for it. The backend must be running, so if a call can't reach it, start it with `system-bridge backend` rather than guessing at its state.
