# System Bridge

> [!IMPORTANT]
> Any version 4 users will need to remove any integrations, and uninstall the
> old application before installing v5 to avoid conflicts. Your token and
> settings will not carry over to the new version.

A bridge for your systems.

> [!NOTE]
> Contributions welcome!
> Feel free to submit a PR if you have any changes, fixes or improvements.

## Features

- Supports Linux and Windows. MacOS is untested but can be compiled and tested by
  the community.
- Access your system information via data modules and the API/WebSocket server.
- Control your system via the API/WebSocket server.
- Integrated with [Home Assistant](https://www.home-assistant.io/integrations/system_bridge)

## Installation

See [installation documentation](https://system-bridge.timmo.dev/docs/install).

## File Locations

- Linux settings/token: `~/.local/share/system-bridge/v5/`
- Windows settings/token: `%LOCALAPPDATA%\system-bridge\v5\`
- macOS settings/token: `~/Library/Application Support/system-bridge/v5/`
- Linux logs: `~/.local/state/system-bridge/YYYY-MM-DD.log`
- Windows logs: `%LOCALAPPDATA%\system-bridge\logs\YYYY-MM-DD.log`
- macOS logs: `~/Library/Logs/system-bridge/YYYY-MM-DD.log`

## Development Setup

See the [developing documentation](https://system-bridge.timmo.dev/developing/)
for toolchain setup, build tasks, the pitchfork dev-server workflow, testing,
and quality checks.

Quick start:

1. Install [`mise`](https://mise.jdx.dev/installing-mise.html) and run `mise install`
1. Run `mise run deps` then `mise run build:all`
1. Run `mise run serve:all` (Linux) or `mise run run` (all platforms)

## Packages

### [Connector](https://github.com/timmo001/system-bridge-connector)

Allows other applications to connect to the backend. For example, in the
[Home Assistant](https://www.home-assistant.io/integrations/system_bridge)
integration.
