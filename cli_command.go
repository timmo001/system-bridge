package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/settings"
	"github.com/urfave/cli/v3"
)

// printJSON writes value as one line of JSON, for scripts and the Omarchy
// plugin
func printJSON(w io.Writer, value any) error {
	out, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintln(w, string(out))
	return err
}

// savedCommand finds a command on the allowlist by its id
func savedCommand(ctx context.Context, id string) (settings.SettingsCommandDefinition, error) {
	commands, err := client.Commands(ctx)
	if err != nil {
		return settings.SettingsCommandDefinition{}, err
	}
	for _, command := range commands {
		if command.ID == id {
			return command, nil
		}
	}
	return settings.SettingsCommandDefinition{}, fmt.Errorf("no command on the allowlist has id %s", id)
}

// printCommand prints a saved command, as JSON with --json
func printCommand(cmd *cli.Command, command settings.SettingsCommandDefinition, action string) error {
	if cmd.Bool("json") {
		return printJSON(cmd.Root().Writer, command)
	}
	_, err := fmt.Fprintf(cmd.Root().Writer, "%s %s (%s)\n", action, command.Name, command.ID)
	return err
}

func commandCommand() *cli.Command {
	jsonFlag := &cli.BoolFlag{Name: "json", Usage: "Output as JSON"}

	return &cli.Command{
		Name:  "command",
		Usage: "List, run, add, change and remove the allowlisted commands, and see the prefabs",
		Commands: []*cli.Command{
			{
				Name:      "add",
				Usage:     "Add a command to the allowlist: a program by its absolute path with its arguments, or a prefab",
				ArgsUsage: "[-- /absolute/path/to/program [arguments...]]",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "name", Usage: "What the command does, shown in clients and Home Assistant", Required: true},
					&cli.StringFlag{Name: "prefab", Usage: "A prefab's id from system-bridge client command prefabs. With a program, the program replaces the prefab's"},
					&cli.StringFlag{Name: "working-dir", Usage: "Absolute path of the directory it runs in"},
					jsonFlag,
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					definition := settings.SettingsCommandDefinition{
						Name:       cmd.String("name"),
						Prefab:     cmd.String("prefab"),
						WorkingDir: cmd.String("working-dir"),
					}
					if args := cmd.Args().Slice(); len(args) > 0 {
						definition.Command = args[0]
						definition.Arguments = args[1:]
					}
					if definition.Command == "" && definition.Prefab == "" {
						return fmt.Errorf("give a program after --, or a --prefab")
					}

					added, err := client.AddCommand(cmdCtx, definition)
					if err != nil {
						return err
					}
					return printCommand(cmd, added, "Added")
				},
			},
			{
				Name:      "update",
				Usage:     "Change a command on the allowlist. Only what's given changes; a program after -- replaces the command and its arguments",
				ArgsUsage: "<command id> [-- /absolute/path/to/program [arguments...]]",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "name", Usage: "What the command does"},
					&cli.StringFlag{Name: "prefab", Usage: "A prefab's id, or an empty string to remove it"},
					&cli.StringFlag{Name: "working-dir", Usage: "Absolute path of the directory it runs in, or an empty string for the default"},
					jsonFlag,
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					args := cmd.Args().Slice()
					if len(args) == 0 {
						return fmt.Errorf("a command id is required")
					}
					current, err := savedCommand(cmdCtx, args[0])
					if err != nil {
						return err
					}

					if cmd.IsSet("name") {
						current.Name = cmd.String("name")
					}
					if cmd.IsSet("prefab") {
						current.Prefab = cmd.String("prefab")
					}
					if cmd.IsSet("working-dir") {
						current.WorkingDir = cmd.String("working-dir")
					}
					if len(args) > 1 {
						current.Command = args[1]
						current.Arguments = args[2:]
					}

					updated, err := client.UpdateCommand(cmdCtx, current)
					if err != nil {
						return err
					}
					return printCommand(cmd, updated, "Updated")
				},
			},
			{
				Name:      "remove",
				Usage:     "Take a command off the allowlist, so clients can no longer run it",
				ArgsUsage: "<command id>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					id := cmd.Args().First()
					if id == "" {
						return fmt.Errorf("a command id is required")
					}
					// The backend succeeds for an id that isn't there, so a
					// typo would look like it worked
					removed, err := savedCommand(cmdCtx, id)
					if err != nil {
						return err
					}
					if err := client.RemoveCommand(cmdCtx, id); err != nil {
						return err
					}
					_, err = fmt.Fprintf(cmd.Root().Writer, "Removed %s (%s)\n", removed.Name, removed.ID)
					return err
				},
			},
			{
				Name:  "list",
				Usage: "List the commands on the allowlist",
				Flags: []cli.Flag{jsonFlag},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					commands, err := client.Commands(cmdCtx)
					if err != nil {
						return err
					}
					if cmd.Bool("json") {
						return printJSON(cmd.Root().Writer, commands)
					}
					table := tabwriter.NewWriter(cmd.Root().Writer, 0, 4, 2, ' ', 0)
					for _, command := range commands {
						runs := strings.TrimSpace(strings.Join(append([]string{command.Command}, command.Arguments...), " "))
						if command.Prefab != "" && command.Command == "" {
							runs = strings.TrimSpace("prefab " + command.Prefab + " " + strings.Join(command.Arguments, " "))
						}
						_, _ = fmt.Fprintf(table, "%s\t%s\t%s\n", command.ID, command.Name, runs)
					}
					return table.Flush()
				},
			},
			{
				Name:  "prefabs",
				Usage: "List the ready-made commands, and whether each can run on this system",
				Flags: []cli.Flag{jsonFlag},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					prefabs, err := client.CommandPrefabs(cmdCtx)
					if err != nil {
						return err
					}
					if cmd.Bool("json") {
						return printJSON(cmd.Root().Writer, prefabs)
					}
					table := tabwriter.NewWriter(cmd.Root().Writer, 0, 4, 2, ' ', 0)
					for _, prefab := range prefabs {
						runs := prefab.Reason
						if prefab.Available {
							runs = strings.TrimSpace(strings.Join(append([]string{prefab.Command}, prefab.Arguments...), " "))
							if prefab.Command == "" {
								runs = "built in"
							}
						}
						_, _ = fmt.Fprintf(table, "%s\t%s\t%s\n", prefab.ID, prefab.Name, runs)
					}
					return table.Flush()
				},
			},
			{
				Name:      "run",
				Usage:     "Run an allowlisted command, print its output and exit with its exit code",
				ArgsUsage: "<command id>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					id := cmd.Args().First()
					if id == "" {
						return fmt.Errorf("a command id is required")
					}
					result, err := client.RunCommand(cmdCtx, id)
					if err != nil {
						return err
					}
					_, _ = fmt.Fprint(cmd.Root().Writer, result.Stdout)
					_, _ = fmt.Fprint(os.Stderr, result.Stderr)
					if result.Error != "" {
						return cli.Exit(result.Error, 1)
					}
					if result.ExitCode != 0 {
						return cli.Exit("", result.ExitCode)
					}
					return nil
				},
			},
		},
	}
}
