---
title: Commands
description: Let clients run programs you choose on the machine running System Bridge.
---

Commands let a client run a program on the machine running System Bridge, such as restarting a service, starting a backup or running a script. Only commands you add to the allowlist can run. A client picks a command by its ID and can't change the program or its arguments.

## Adding a command

1. In the [web client](/using/web-client/), open the **System** page and scroll to **Commands**.
2. Under **Add a command**, fill in:
   - **Name**: what the command is called in lists, such as "Restart audio".
   - **Command**: the program's full path, such as `/usr/bin/systemctl` or `C:\Scripts\backup.ps1`.
   - **Arguments**: anything to pass to the program, separated by commas, such as `--user, restart, pipewire`.
   - **Working directory**: where the program runs. Optional.
3. Select **Add**.

The command appears in the list with its ID. Select the copy button next to the ID to use it from another client.

System Bridge checks a command when it's added and again before each run:

- The command must be a full path to a file that exists.
- On Linux and macOS the file must be executable. On Windows it must end in `.exe`, `.bat`, `.cmd` or `.ps1`.
- The working directory, when set, must exist.

The program runs directly, not through a shell, so pipes, `&&` and variables such as `$HOME` aren't expanded. To use them, put them in a script and add the script.

## Running a command

- **Web client**: select **Run** next to the command. When it finishes, the exit code shows under it, with anything the command printed.
- **API**: send [`COMMAND_EXECUTE`](/api/websocket/system/#execute-command) with the command's ID. You get `COMMAND_EXECUTING` straight away, then `COMMAND_COMPLETED` with the exit code and output once it finishes.
- **MCP**: an assistant can list the commands with [`system_bridge_list_commands`](/api/mcp/#system_bridge_list_commands) and run one with [`system_bridge_run_command`](/api/mcp/#system_bridge_run_command), which waits for it to finish.

A command can run for up to 5 minutes before System Bridge stops it. Output over 1 MB is cut off. Stopping System Bridge also stops any commands still running.

## Removing a command

Select the bin button next to the command. Clients can't run it from then on.

## Security

Anyone with your API token can run every command on the allowlist, so only add commands you're happy for them to run. An attempt to run a command that isn't on the list is logged as a warning. At the `INFO` log level, each run is logged too, with its command, arguments and the connection that asked for it. See [privacy and security](/privacy/).
