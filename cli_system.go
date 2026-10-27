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
		Usage: "Change system settings: the power profile and keeping awake",
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
			{
				Name:      "keep-awake",
				Usage:     "Keep the system from idling, or let it idle again",
				ArgsUsage: "<on|off>",
				Flags: []cli.Flag{
					&cli.DurationFlag{
						Name:  "for",
						Usage: "Let it idle again after this long, such as 30m or 2h",
					},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					var enabled bool
					switch cmd.Args().First() {
					case "on":
						enabled = true
					case "off":
						enabled = false
					default:
						return fmt.Errorf("choose on or off")
					}
					request := map[string]any{"enabled": enabled}
					if duration := cmd.Duration("for"); duration > 0 {
						request["duration"] = int(duration.Seconds())
					}
					return client.Send(cmdCtx, event.EventSystemSetKeepAwake, request)
				},
			},
		},
	}
}
