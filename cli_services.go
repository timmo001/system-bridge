package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/types"
	"github.com/urfave/cli/v3"
)

func servicesCommand() *cli.Command {
	return &cli.Command{
		Name:  "services",
		Usage: "List, watch and run the actions of the services, timers and checks the services providers report",
		Commands: []*cli.Command{
			{
				Name:  "list",
				Usage: "List each item with its health, whether it's busy and its summary, then any provider errors",
				Flags: []cli.Flag{&cli.BoolFlag{Name: "json", Usage: "Output the module's data as JSON"}},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					data, err := client.Services(cmdCtx)
					if err != nil {
						return err
					}
					if cmd.Bool("json") {
						return printJSON(cmd.Root().Writer, data)
					}
					return printServices(cmd.Root().Writer, data)
				},
			},
			{
				Name:      "act",
				Usage:     "Run one of an item's actions, print its output and exit with 1 if it failed",
				ArgsUsage: "<provider> <item> <action>",
				Flags: []cli.Flag{
					&cli.BoolFlag{Name: "yes", Aliases: []string{"y"}, Usage: "Run it without asking, even when the action asks for confirmation"},
					&cli.BoolFlag{Name: "json", Usage: "Output the result as JSON"},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					args := cmd.Args().Slice()
					if len(args) != 3 {
						return fmt.Errorf("give the provider, the item and the action, as system-bridge client services list shows them")
					}
					provider, item, action := args[0], args[1], args[2]

					if !cmd.Bool("yes") {
						if err := confirmServiceAction(cmdCtx, cmd, provider, item, action); err != nil {
							return err
						}
					}

					result, err := client.RunServiceAction(cmdCtx, provider, item, action)
					if err != nil {
						return err
					}
					if cmd.Bool("json") {
						if err := printJSON(cmd.Root().Writer, result); err != nil {
							return err
						}
					} else {
						_, _ = fmt.Fprint(cmd.Root().Writer, result.Output)
						if result.Output != "" && !strings.HasSuffix(result.Output, "\n") {
							_, _ = fmt.Fprintln(cmd.Root().Writer)
						}
					}
					if !result.OK {
						return cli.Exit(result.Summary, 1)
					}
					return nil
				},
			},
			{
				Name:  "watch",
				Usage: "Print the services module's data as NDJSON whenever it changes",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					return client.Watch(cmdCtx, client.WatchOptions{
						Modules: []types.ModuleName{types.ModuleServices},
						Writer:  cmd.Root().Writer,
					})
				},
			},
		},
	}
}

// confirmServiceAction asks on the terminal before an action with a confirm
// question, and refuses one when there's no terminal to ask on
func confirmServiceAction(ctx context.Context, cmd *cli.Command, provider, item, action string) error {
	data, err := client.Services(ctx)
	if err != nil {
		return err
	}
	var question *string
	for _, i := range data.Items {
		if i.Provider != provider || i.ID != item {
			continue
		}
		for _, a := range i.Actions {
			// A disabled action is refused with why, so there's nothing to ask
			if a.ID == action && a.Disabled == nil {
				question = a.Confirm
			}
		}
	}
	if question == nil {
		return nil
	}

	if info, err := os.Stdin.Stat(); err != nil || info.Mode()&os.ModeCharDevice == 0 {
		return fmt.Errorf("%s asks: %s Run it again with --yes to go ahead", action, *question)
	}
	_, _ = fmt.Fprintf(cmd.Root().Writer, "%s [y/N] ", *question)
	answer, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	if answer = strings.ToLower(strings.TrimSpace(answer)); answer != "y" && answer != "yes" {
		return cli.Exit("Not run", 1)
	}
	return nil
}

// printServices writes a table of the items, then the problems
func printServices(w io.Writer, data types.ServicesData) error {
	if len(data.Providers) == 0 {
		_, err := fmt.Fprintln(w, "No services providers are set up. Add one under services.providers in the settings file.")
		return err
	}

	table := tabwriter.NewWriter(w, 0, 4, 2, ' ', 0)
	_, _ = fmt.Fprintln(table, "PROVIDER\tID\tLABEL\tHEALTH\tBUSY\tSUMMARY")
	for _, item := range data.Items {
		busy := ""
		if item.Busy {
			busy = "busy"
		}
		summary := ""
		if item.Summary != nil {
			summary = *item.Summary
		}
		_, _ = fmt.Fprintf(table, "%s\t%s\t%s\t%s\t%s\t%s\n", item.Provider, item.ID, item.Label, item.Health, busy, summary)
	}
	if err := table.Flush(); err != nil {
		return err
	}

	for _, provider := range data.Providers {
		if provider.Error != nil {
			_, _ = fmt.Fprintf(w, "\nProvider %s failed: %s\n", provider.ID, *provider.Error)
		}
	}
	for _, problem := range data.Errors {
		_, _ = fmt.Fprintf(w, "\n%s: %s: %s\n", problem.Provider, problem.Source, problem.Message)
	}
	return nil
}
