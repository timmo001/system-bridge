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
| **Sleep** (`sleep`) | `rundll32.exe powrprof.dll,SetSuspendState 0,1,0` | `pmset sleepnow` |
| **Log out** (`logout`) | `shutdown.exe /l` | `osascript`, telling System Events to log out |
| **Open the file manager** (`file-manager`) | `explorer.exe` at your home folder | `open` at your home folder |
| **Open a terminal** (`terminal`) | `wt.exe` (Windows Terminal) | `open -a Terminal` |
| **Get the clipboard** (`clipboard`) | `powershell.exe Get-Clipboard` | `pbpaste` |
| **Screenshot** (`screenshot`) | Built in, capturing every display | `screencapture` |
| **Screenshot of a window** (`screenshot-window`) | Built in, capturing the focused window | `screencapture`, which asks you to pick the window |
| **Screenshot of a region** (`screenshot-region`) | Not available | `screencapture` |

On Linux, System Bridge works out which desktop is running, even when it's started outside it such as from systemd, and uses the first program in the list that suits that desktop and is installed. Each desktop's own tools come first, with Omarchy's ahead of the rest on Hyprland, then popular tools that work on more than one desktop.

| Prefab | Hyprland and Omarchy | KDE Plasma | GNOME | Other Wayland | X11 |
| --- | --- | --- | --- | --- | --- |
| **Lock screen** | `omarchy-system-lock`, `loginctl` | `loginctl` | `loginctl` | `loginctl` | `loginctl` |
| **Sleep** | `systemctl suspend` | `systemctl suspend` | `systemctl suspend` | `systemctl suspend` | `systemctl suspend` |
| **Log out** | `omarchy-system logout`, `hyprctl dispatch 'hl.dsp.exit()'` with a Lua config or `hyprctl dispatch exit`, `loginctl` | `qdbus6` or `qdbus`, `loginctl` | `gnome-session-quit`, `loginctl` | `loginctl` | `loginctl` |
| **Open the file manager** | `omarchy-launch-nautilus`, `xdg-open` | `xdg-open` | `xdg-open` | `xdg-open` | `xdg-open` |
| **Open a terminal** | `omarchy-launch-terminal`, `xdg-terminal-exec` | `konsole`, `xdg-terminal-exec` | `kgx` or `gnome-terminal`, `xdg-terminal-exec` | `xdg-terminal-exec` | `xdg-terminal-exec`, `x-terminal-emulator` |
| **Get the clipboard** | `wl-paste` | `wl-paste` | `wl-paste` | `wl-paste` | `xclip`, `xsel` |
| **Screenshot** | `omasnap`, `grimblast`, `grim`, `flameshot`, portal | `spectacle`, `flameshot`, portal | `gnome-screenshot`, `flameshot`, portal | `grim`, `flameshot`, portal | `flameshot`, `scrot`, `maim`, portal |
| **Screenshot of a window** | `omasnap`, `grimblast`, `hyprshot` | `spectacle` | `gnome-screenshot` | | `scrot` |
| **Screenshot of a region** | `omasnap`, `grimblast`, `hyprshot`, `flameshot` | `spectacle`, `flameshot` | `gnome-screenshot`, `flameshot` | `flameshot` | `flameshot`, `scrot`, `maim` |

On Omarchy, **Screenshot** captures the focused monitor, and **Screenshot of a window** asks you to pick the window, as Omarchy's own screenshot tool does.

With more than one monitor connected, **Type** also lists a screenshot of each monitor, such as **Screenshot of DP-1** (`screenshot-monitor:DP-1`), so you can capture the one you want. On Linux these use `grim`, on Hyprland and other wlroots desktops, and on Windows they're built in, numbered from **display 1**. If the monitor is unplugged later, the command stays and says the monitor isn't connected until it's back.

When none of these is installed, **Screenshot** asks the desktop portal instead, which most Linux desktops have. GNOME and KDE ask you to allow it the first time.

**Open the file manager** and **Open a terminal** return as soon as the app starts, and the app stays open after the command finishes. **Get the clipboard** returns the clipboard's text as its output. Setting the clipboard isn't a prefab, as a command can't take text from the client.

Like any other command, a prefab only runs once it's on your list.

### Omarchy shell calls

On Omarchy, **Omarchy shell call** (`omarchy-ipc`) calls one of the Omarchy shell's IPC functions, such as `media playPause` or `notifications dismissAll`, so you can allow just the calls you want. Pick it from **Type**, then pick a **Target** and a **Function** from the ones the shell answers to. If the function takes arguments, fill them in, separated by commas, in the order shown. Whatever the function answers is the command's output.

The command's arguments hold the target, the function, then the function's own arguments, so through the [API](/api/websocket/system/#settings-keys) the entry for `media playPause` has `"prefab": "omarchy-ipc"` and `"arguments": ["media", "playPause"]`. The call fails, saying so, if the shell isn't running or no longer has that function.

### Screenshots

Screenshots are saved as PNGs to a **Screenshots** folder in your pictures folder (`$XDG_PICTURES_DIR` when it's set, or `Pictures` in your home folder), named by the time they were taken, such as `screenshot-20261025-143000.png`. Tools that name their own files, such as `omasnap`, keep their name. When one finishes, its output is the file's full path. If the program finishes without saving anything, such as when you cancel picking a region, the command reports that nothing was saved.

Prefabs that ask you to pick a window or region need someone at the computer.

When you give a screenshot prefab your own program, put these in its arguments where the file should go:

| Placeholder | Becomes |
| --- | --- |
| `{output}` | The file's full path |
| `{outputDir}` | The folder it's saved in |
| `{outputName}` | The file's name |

Only commands added from a prefab have their placeholders filled in. A program that picks its own file name works too, as long as it saves into the folder: the newest file it saves there becomes the output.

## Running a command

- **Web client**: select **Run** next to the command. When it finishes, the exit code shows under it, with anything the command printed.
- **API**: send [`COMMAND_EXECUTE`](/api/websocket/system/#execute-command) with the command's ID. You get `COMMAND_EXECUTING` straight away, then `COMMAND_COMPLETED` with the exit code and output once it finishes.
- **MCP**: an assistant can list the commands with [`system_bridge_list_commands`](/api/mcp/#system_bridge_list_commands), see the prefabs with [`system_bridge_list_command_prefabs`](/api/mcp/#system_bridge_list_command_prefabs), and run one with [`system_bridge_run_command`](/api/mcp/#system_bridge_run_command), which waits for it to finish.

A command can run for up to 5 minutes before System Bridge stops it. Output over 1 MB is cut off. Stopping System Bridge also stops any commands still running.

## Editing a command

Each part of a command in the list is a button: its name, the program, the arguments and the working directory. Select one to change just that part in a small popover, then select **Save**. The command keeps its ID, so clients using it carry on working.

Changing a prefab command's program gives it your own program in place of the prefab's. Leave the program empty to go back to the prefab's. System Bridge checks a new program or working directory the same way as when a command is added.

## Removing a command

Select the bin button next to the command. Clients can't run it from then on.

## Security

Anyone with your API token can run every command on the allowlist, so only add commands you're happy for them to run. An attempt to run a command that isn't on the list is logged as a warning. At the `INFO` log level, each run is logged too, with its command, arguments and the connection that asked for it. See [privacy and security](/privacy/).
