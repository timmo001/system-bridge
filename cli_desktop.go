package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
	"github.com/urfave/cli/v3"
)

// printReply sends an event and prints its reply's data as one line of JSON
func printReply(ctx context.Context, cmd *cli.Command, eventType event.EventType, data any) error {
	raw, err := client.Request(ctx, eventType, data)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintln(cmd.Root().Writer, string(raw))
	return err
}

// setFlags adds each of the bool flags that was given to data
func setFlags(cmd *cli.Command, data map[string]any, flags ...string) {
	for _, flag := range flags {
		if cmd.IsSet(flag) {
			data[flag] = cmd.Bool(flag)
		}
	}
}

// windowCommand is a command that sends an event for the window it's given
func windowCommand(name string, usage string, eventType event.EventType) *cli.Command {
	return &cli.Command{
		Name:      name,
		Usage:     usage,
		ArgsUsage: "<window id>",
		Action: func(cmdCtx context.Context, cmd *cli.Command) error {
			id := cmd.Args().First()
			if id == "" {
				return fmt.Errorf("a window id is required")
			}
			return client.Send(cmdCtx, eventType, map[string]any{"id": id})
		},
	}
}

func desktopCommand() *cli.Command {
	return &cli.Command{
		Name:  "desktop",
		Usage: "Control windows, workspaces and the keyboard layout",
		Commands: []*cli.Command{
			windowCommand("close", "Ask a window to close", event.EventDesktopCloseWindow),
			windowCommand("focus", "Focus a window", event.EventDesktopFocusWindow),
			{
				Name:      "layout",
				Usage:     "Switch the keyboard to one of its layouts",
				ArgsUsage: "<layout>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					layout := cmd.Args().First()
					if layout == "" {
						return fmt.Errorf("a keyboard layout is required")
					}
					return client.Send(cmdCtx, event.EventDesktopSetKeyboardLayout, map[string]any{"layout": layout})
				},
			},
			{
				Name:      "state",
				Usage:     "Make a window fullscreen, maximised or minimised, or not",
				ArgsUsage: "<window id>",
				Flags: []cli.Flag{
					&cli.BoolFlag{Name: "fullscreen", Usage: "Make the window fullscreen, or not with --fullscreen=false"},
					&cli.BoolFlag{Name: "maximised", Usage: "Maximise the window, or not with --maximised=false"},
					&cli.BoolFlag{Name: "minimised", Usage: "Minimise the window, or not with --minimised=false"},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					id := cmd.Args().First()
					if id == "" {
						return fmt.Errorf("a window id is required")
					}
					data := map[string]any{"id": id}
					setFlags(cmd, data, "fullscreen", "maximised", "minimised")
					if len(data) == 1 {
						return fmt.Errorf("set --fullscreen, --maximised or --minimised")
					}
					return client.Send(cmdCtx, event.EventDesktopSetWindowState, data)
				},
			},
			{
				Name:      "workspace",
				Usage:     "Show and focus a workspace",
				ArgsUsage: "<workspace id>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					id := cmd.Args().First()
					if id == "" {
						return fmt.Errorf("a workspace id is required")
					}
					return client.Send(cmdCtx, event.EventDesktopFocusWorkspace, map[string]any{"id": id})
				},
			},
		},
	}
}

func hyprlandCommand() *cli.Command {
	return &cli.Command{
		Name:  "hyprland",
		Usage: "Control Hyprland windows, the cursor, global shortcuts and config",
		Commands: []*cli.Command{
			{
				Name:      "dispatch",
				Usage:     "Run a dispatcher on the focused window, or --window: center_window, cycle_next_window, cycle_previous_window, group_next, group_previous, lock_group, lock_groups, move_focus, swap_window, toggle_group, toggle_split, unlock_group or unlock_groups",
				ArgsUsage: "<dispatcher> [down|left|right|up]",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "window", Usage: "A window id to focus before running the dispatcher"},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					dispatcher, direction := cmd.Args().Get(0), cmd.Args().Get(1)
					if dispatcher == "" {
						return fmt.Errorf("a dispatcher is required")
					}
					data := map[string]any{"dispatcher": dispatcher}
					if direction != "" {
						data["direction"] = direction
					}
					if window := cmd.String("window"); window != "" {
						data["id"] = window
					}
					return client.Send(cmdCtx, event.EventHyprlandDispatch, data)
				},
			},
			{
				Name:      "move",
				Usage:     "Move a window to a workspace, leaving the focus where it is",
				ArgsUsage: "<window id> <workspace>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					id, workspace := cmd.Args().Get(0), cmd.Args().Get(1)
					if id == "" || workspace == "" {
						return fmt.Errorf("a window id and a workspace are required")
					}
					return client.Send(cmdCtx, event.EventHyprlandMoveWindow, map[string]any{"id": id, "workspace": workspace})
				},
			},
			{
				Name:  "reload",
				Usage: "Reload Hyprland's config",
				Action: func(cmdCtx context.Context, _ *cli.Command) error {
					return client.Send(cmdCtx, event.EventHyprlandReloadConfig, map[string]any{})
				},
			},
			{
				Name:      "set",
				Usage:     "Float or tile a window, pin or unpin it, and move or resize it",
				ArgsUsage: "<window id>",
				Flags: []cli.Flag{
					&cli.BoolFlag{Name: "floating", Usage: "Float the window, or tile it with --floating=false"},
					&cli.BoolFlag{Name: "pinned", Usage: "Pin the window, or unpin it with --pinned=false"},
					&cli.IntFlag{Name: "x", Usage: "Move the window's left edge here, with --y"},
					&cli.IntFlag{Name: "y", Usage: "Move the window's top edge here, with --x"},
					&cli.IntFlag{Name: "width", Usage: "Resize the window to this width, with --height"},
					&cli.IntFlag{Name: "height", Usage: "Resize the window to this height, with --width"},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					id := cmd.Args().First()
					if id == "" {
						return fmt.Errorf("a window id is required")
					}
					data := map[string]any{"id": id}
					setFlags(cmd, data, "floating", "pinned")
					for _, flag := range []string{"x", "y", "width", "height"} {
						if cmd.IsSet(flag) {
							data[flag] = cmd.Int(flag)
						}
					}
					if len(data) == 1 {
						return fmt.Errorf("set --floating, --pinned, --x and --y, or --width and --height")
					}
					return client.Send(cmdCtx, event.EventHyprlandSetWindow, data)
				},
			},
			windowCommand("kill", "Kill a window's app, without asking it to close first", event.EventHyprlandKillWindow),
			{
				Name:  "workspace",
				Usage: "Rename a workspace, or move it to another display",
				Commands: []*cli.Command{
					{
						Name:      "rename",
						Usage:     "Rename a workspace, or give it back its default name with no name",
						ArgsUsage: "<workspace id> [name]",
						Action: func(cmdCtx context.Context, cmd *cli.Command) error {
							id := cmd.Args().First()
							if id == "" {
								return fmt.Errorf("a workspace id is required")
							}
							return client.Send(cmdCtx, event.EventHyprlandRenameWorkspace, map[string]any{"id": id, "name": cmd.Args().Get(1)})
						},
					},
					{
						Name:      "move",
						Usage:     "Move a workspace to another display",
						ArgsUsage: "<workspace id> <display id>",
						Action: func(cmdCtx context.Context, cmd *cli.Command) error {
							id, display := cmd.Args().Get(0), cmd.Args().Get(1)
							if id == "" || display == "" {
								return fmt.Errorf("a workspace id and a display id are required")
							}
							return client.Send(cmdCtx, event.EventHyprlandMoveWorkspace, map[string]any{"id": id, "display": display})
						},
					},
				},
			},
			{
				Name:      "option",
				Usage:     "Print any config option, or set it until the config reloads, by its name such as general.gaps_in or general:layout",
				ArgsUsage: "<name> [true|false|number|text]",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					name := cmd.Args().Get(0)
					if name == "" {
						return fmt.Errorf("an option name is required")
					}
					if cmd.Args().Len() < 2 {
						return printReply(cmdCtx, cmd, event.EventHyprlandGetOption, map[string]any{"name": name})
					}
					text := strings.Join(cmd.Args().Slice()[1:], " ")
					// A number first, as ParseBool would take 0 and 1 as false and true
					var value any = text
					if number, err := strconv.ParseFloat(text, 64); err == nil {
						value = number
					} else if parsed, err := strconv.ParseBool(text); err == nil {
						value = parsed
					}
					return client.Send(cmdCtx, event.EventHyprlandSetOption, map[string]any{"name": name, "value": value})
				},
			},
			{
				Name:      "cursor",
				Usage:     "Print where the pointer is, or move it to x and y across every display",
				ArgsUsage: "[x y]",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					if cmd.Args().Len() == 0 {
						return printReply(cmdCtx, cmd, event.EventHyprlandGetCursorPosition, map[string]any{})
					}
					x, errX := strconv.Atoi(cmd.Args().Get(0))
					y, errY := strconv.Atoi(cmd.Args().Get(1))
					if errX != nil || errY != nil {
						return fmt.Errorf("x and y must be whole numbers")
					}
					return client.Send(cmdCtx, event.EventHyprlandMoveCursor, map[string]any{"x": x, "y": y})
				},
			},
			{
				Name:  "log",
				Usage: "Print the end of Hyprland's log",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					raw, err := client.Request(cmdCtx, event.EventHyprlandGetLog, map[string]any{})
					if err != nil {
						return err
					}
					var log types.HyprlandLog
					if err := json.Unmarshal(raw, &log); err != nil {
						return fmt.Errorf("decode log: %w", err)
					}
					for _, line := range log.Lines {
						_, _ = fmt.Fprintln(cmd.Root().Writer, line)
					}
					return nil
				},
			},
			{
				Name:      "event",
				Usage:     "Send a custom event, as a bind to the event dispatcher would",
				ArgsUsage: "<name>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					name := strings.Join(cmd.Args().Slice(), " ")
					if name == "" {
						return fmt.Errorf("an event name is required")
					}
					return client.Send(cmdCtx, event.EventHyprlandSendEvent, map[string]any{"name": name})
				},
			},
			{
				Name:      "exec",
				Usage:     "Run a command through Hyprland, when desktop.hyprlandCode is on in the settings",
				ArgsUsage: "<command>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					command := strings.Join(cmd.Args().Slice(), " ")
					if command == "" {
						return fmt.Errorf("a command is required")
					}
					return client.Send(cmdCtx, event.EventHyprlandExec, map[string]any{"command": command})
				},
			},
			{
				Name:      "raw",
				Usage:     "Run any dispatch, as the running config writes it, when desktop.hyprlandCode is on in the settings",
				ArgsUsage: "<dispatch>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					dispatch := strings.Join(cmd.Args().Slice(), " ")
					if dispatch == "" {
						return fmt.Errorf("a dispatch is required")
					}
					return client.Send(cmdCtx, event.EventHyprlandDispatchRaw, map[string]any{"dispatch": dispatch})
				},
			},
			{
				Name:      "eval",
				Usage:     "Run Lua in Hyprland, with a Lua config, when desktop.hyprlandCode is on in the settings",
				ArgsUsage: "<code>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					code := strings.Join(cmd.Args().Slice(), " ")
					if code == "" {
						return fmt.Errorf("code is required")
					}
					return client.Send(cmdCtx, event.EventHyprlandEval, map[string]any{"code": code})
				},
			},
			{
				Name:      "submap",
				Usage:     "Switch binds to a submap, or back to the default with no name",
				ArgsUsage: "[name]",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					return client.Send(cmdCtx, event.EventHyprlandSetSubmap, map[string]any{"name": cmd.Args().First()})
				},
			},
			{
				Name:      "shortcut",
				Usage:     "Trigger a global shortcut an app registered",
				ArgsUsage: "<name>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					name := cmd.Args().First()
					if name == "" {
						return fmt.Errorf("a shortcut name is required")
					}
					return client.Send(cmdCtx, event.EventHyprlandRunGlobalShortcut, map[string]any{"name": name})
				},
			},
		},
	}
}
