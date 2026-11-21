package main

import (
	"context"
	"fmt"
	"io"
	"text/tabwriter"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/types"
	"github.com/urfave/cli/v3"
)

func servicesCommand() *cli.Command {
	return &cli.Command{
		Name:  "services",
		Usage: "List and watch the services, timers and checks the services providers report",
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
