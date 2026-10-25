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

## Prefab commands

Prefabs are ready-made commands for common tasks. Each one picks the right program for the platform and desktop, so you don't need its path.

1. Under **Add a command**, pick the prefab from **Type**. Its name and the program it would run fill in.
2. Leave **Command** empty to use that program, and select **Add**.

System Bridge looks for the program each time the command runs, so installing or moving a tool later doesn't need the command adding again. A prefab whose tools aren't installed is greyed out, with the tool to install. If one you've added stops being available, the reason shows under it and **Run** is turned off.

To use your own program instead, such as a script of yours, fill in **Command** and **Arguments**. The command keeps the prefab's name and its ID, so clients using it carry on working.

On Windows and macOS each prefab has one way to run:

| Prefab | Windows | macOS |
| --- | --- | --- |
| **Lock screen** (`lock`) | `rundll32.exe user32.dll,LockWorkStation` | `pmset displaysleepnow` |
| **Screenshot** (`screenshot`) | Built in, capturing every display | `screencapture` |
| **Screenshot of a window** (`screenshot-window`) | Built in, capturing the focused window | `screencapture`, which asks you to pick the window |
| **Screenshot of a region** (`screenshot-region`) | Not available | `screencapture` |

On Linux, System Bridge works out which desktop is running, even when it's started outside it such as from systemd, and uses the first program in the list that suits that desktop and is installed. Each desktop's own tools come first, with Omarchy's ahead of the rest on Hyprland, then popular tools that work on more than one desktop.

| Prefab | Hyprland and Omarchy | KDE Plasma | GNOME | Other Wayland | X11 |
| --- | --- | --- | --- | --- | --- |
| **Lock screen** | `omarchy-system-lock`, `loginctl` | `loginctl` | `loginctl` | `loginctl` | `loginctl` |
| **Screenshot** | `omasnap`, `grimblast`, `grim`, `flameshot`, portal | `spectacle`, `flameshot`, portal | `gnome-screenshot`, `flameshot`, portal | `grim`, `flameshot`, portal | `flameshot`, `scrot`, `maim`, portal |
| **Screenshot of a window** | `omasnap`, `grimblast`, `hyprshot` | `spectacle` | `gnome-screenshot` | | `scrot` |
| **Screenshot of a region** | `omasnap`, `grimblast`, `hyprshot`, `flameshot` | `spectacle`, `flameshot` | `gnome-screenshot`, `flameshot` | `flameshot` | `flameshot`, `scrot`, `maim` |

On Omarchy, **Screenshot** captures the focused monitor, and **Screenshot of a window** asks you to pick the window, as Omarchy's own screenshot tool does.

When none of these is installed, **Screenshot** asks the desktop portal instead, which most Linux desktops have. GNOME and KDE ask you to allow it the first time.

Like any other command, a prefab only runs once it's on your list.

### Screenshots

Screenshots are saved as PNGs to a **Screenshots** folder in your pictures folder (`$XDG_PICTURES_DIR` when it's set, or `Pictures` in your home folder), named by the time they were taken, such as `screenshot-20261025-143000.png`. Tools that name their own files, such as `omasnap`, keep their name. When one finishes, its output is the file's full path. If the program finishes without saving anything, such as when you cancel picking a region, the command reports that nothing was saved.

Prefabs that ask you to pick a window or region need someone at the computer.

When you give a screenshot prefab your own program, put these in its arguments where the file should go:

| Placeholder | Becomes |
| --- | --- |
| `{output}` | The file's full path |
| `{outputDir}` | The folder it's saved in |
| `{outputName}` | The file's name |

For example, to capture a single display on Wayland, use `/usr/bin/grim` with the arguments `-o, DP-1, {output}`, swapping `DP-1` for the display's name. Only commands added from a prefab have their placeholders filled in. A program that picks its own file name works too, as long as it saves into the folder: the newest file it saves there becomes the output.

## Running a command

- **Web client**: select **Run** next to the command. When it finishes, the exit code shows under it, with anything the command printed.
- **API**: send [`COMMAND_EXECUTE`](/api/websocket/system/#execute-command) with the command's ID. You get `COMMAND_EXECUTING` straight away, then `COMMAND_COMPLETED` with the exit code and output once it finishes.
- **MCP**: an assistant can list the commands with [`system_bridge_list_commands`](/api/mcp/#system_bridge_list_commands), see the prefabs with [`system_bridge_list_command_prefabs`](/api/mcp/#system_bridge_list_command_prefabs), and run one with [`system_bridge_run_command`](/api/mcp/#system_bridge_run_command), which waits for it to finish.

A command can run for up to 5 minutes before System Bridge stops it. Output over 1 MB is cut off. Stopping System Bridge also stops any commands still running.

## Removing a command

Select the bin button next to the command. Clients can't run it from then on.

## Security

Anyone with your API token can run every command on the allowlist, so only add commands you're happy for them to run. An attempt to run a command that isn't on the list is logged as a warning. At the `INFO` log level, each run is logged too, with its command, arguments and the connection that asked for it. See [privacy and security](/privacy/).
