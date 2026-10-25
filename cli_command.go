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

func commandCommand() *cli.Command {
	jsonFlag := &cli.BoolFlag{Name: "json", Usage: "Output as JSON"}

	return &cli.Command{
		Name:  "command",
		Usage: "List and run the allowlisted commands, and see the prefabs",
		Commands: []*cli.Command{
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
