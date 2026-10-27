package main

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/urfave/cli/v3"
)

func systemCommand() *cli.Command {
	return &cli.Command{
		Name:  "system",
		Usage: "Change system settings, such as the power profile",
		Commands: []*cli.Command{
			{
				Name:      "power-profile",
				Usage:     "Switch the power profile, to one of the system data's power_profiles",
				ArgsUsage: "<profile, such as power-saver, balanced or performance>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					profile := cmd.Args().First()
					if profile == "" {
						return fmt.Errorf("a power profile is required")
					}
					return client.Send(cmdCtx, event.EventSystemSetPowerProfile, map[string]any{"profile": profile})
				},
			},
		},
	}
}
