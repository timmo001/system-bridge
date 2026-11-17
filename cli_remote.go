package main

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/client"
	"github.com/urfave/cli/v3"
)

// remoteFlag sends a command's calls to a paired remote. It's on the client
// and agent commands, and their subcommands take it too.
func remoteFlag() cli.Flag {
	return &cli.StringFlag{
		Name:    "remote",
		Usage:   "Call a paired remote's System Bridge, by its name, host or ID from system-bridge client remote list, rather than this computer's",
		Sources: cli.EnvVars("SYSTEM_BRIDGE_REMOTE"),
	}
}

// withRemote is a Before hook that points the client's calls at the remote
// --remote names, if any
func withRemote(ctx context.Context, cmd *cli.Command) (context.Context, error) {
	return client.WithRemote(ctx, cmd.String("remote")), nil
}

// localOnly is a Before hook for commands that only work on this computer,
// such as managing its keys
func localOnly(ctx context.Context, cmd *cli.Command) (context.Context, error) {
	if name := client.RemoteName(ctx); name != "" {
		return ctx, fmt.Errorf("%s only works on this computer, not on the remote %s: drop --remote, or unset SYSTEM_BRIDGE_REMOTE", cmd.FullName(), name)
	}
	return ctx, nil
}

func remoteCommand() *cli.Command {
	return &cli.Command{
		Name:  "remote",
		Usage: "Pair with another computer's System Bridge, so --remote sends commands there",
		Commands: []*cli.Command{
			{
				Name:      "pair",
				Usage:     "Pair with a one-time pairing code, or its link, from Settings > Devices in that computer's web client or system-bridge client remote code there",
				ArgsUsage: "<link or code>",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "host", Usage: "The computer's address, for a code without its link"},
					&cli.IntFlag{Name: "port", Usage: "Its port, for a code without its link", Value: 9170},
					&cli.BoolFlag{Name: "ssl", Usage: "Connect over HTTPS, for a code without its link"},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					remote, err := client.Pair(cmdCtx, cmd.Args().First(), client.PairOptions{
						Host: cmd.String("host"),
						Port: cmd.Int("port"),
						SSL:  cmd.Bool("ssl"),
					})
					if err != nil {
						return err
					}
					_, err = fmt.Fprintf(cmd.Root().Writer, "Paired with %s at %s. Send commands there with --remote %s\n", remote.Name, remote.URL, remote.Name)
					return err
				},
			},
			{
				Name:  "list",
				Usage: "List the paired remotes",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					remotes, err := client.Remotes()
					if err != nil {
						return err
					}
					for _, remote := range remotes {
						if _, err := fmt.Fprintf(cmd.Root().Writer, "%s\t%s\t%s\tpaired %s\n", remote.ID, remote.Name, remote.URL, remote.Paired); err != nil {
							return err
						}
					}
					return nil
				},
			},
			{
				Name:      "remove",
				Usage:     "Forget a paired remote, by its name, host or ID",
				ArgsUsage: "<remote>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					name := cmd.Args().First()
					if name == "" {
						return fmt.Errorf("a remote is required, from system-bridge client remote list")
					}
					remote, err := client.RemoveRemote(name)
					if err != nil {
						return err
					}
					_, err = fmt.Fprintf(cmd.Root().Writer, "Forgot %s. Its key for this computer stays under Settings > Devices there until you remove it.\n", remote.Name)
					return err
				},
			},
			{
				Name:  "code",
				Usage: "Print a one-time pairing link for another computer to pair with this one, or with the remote --remote names",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					code, err := client.PairCode(cmdCtx)
					if err != nil {
						return err
					}
					_, err = fmt.Fprintf(cmd.Root().Writer, "%s\n\nOn the other computer, within 5 minutes, run:\n  system-bridge client remote pair '%s'\n", code.Link, code.Link)
					return err
				},
			},
		},
	}
}
