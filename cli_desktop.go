package main

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/urfave/cli/v3"
)

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
		Usage: "Control Hyprland windows, global shortcuts and config",
		Commands: []*cli.Command{
			{
				Name:      "dispatch",
				Usage:     "Run a dispatcher on the focused window: center_window, cycle_next_window, cycle_previous_window, move_focus, swap_window, toggle_group or toggle_split",
				ArgsUsage: "<dispatcher> [down|left|right|up]",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					dispatcher, direction := cmd.Args().Get(0), cmd.Args().Get(1)
					if dispatcher == "" {
						return fmt.Errorf("a dispatcher is required")
					}
					data := map[string]any{"dispatcher": dispatcher}
					if direction != "" {
						data["direction"] = direction
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
