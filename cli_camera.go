package main

import (
	"context"
	"fmt"
	"strconv"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/urfave/cli/v3"
)

func cameraCommand() *cli.Command {
	return &cli.Command{
		Name:  "camera",
		Usage: "Control webcams",
		Commands: []*cli.Command{
			{
				Name:      "control",
				Usage:     "Set one of a camera's controls, such as its brightness or zoom",
				ArgsUsage: "<camera id> <control id> <value>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					if cmd.Args().Len() != 3 {
						return fmt.Errorf("give a camera id, a control id and a value")
					}
					value, err := strconv.ParseInt(cmd.Args().Get(2), 10, 64)
					if err != nil {
						return fmt.Errorf("the value must be a whole number")
					}
					return client.SendWithin(cmdCtx, client.SlowSendTimeout, event.EventCameraControl, map[string]any{
						"id":      cmd.Args().Get(0),
						"control": cmd.Args().Get(1),
						"value":   value,
					})
				},
			},
		},
	}
}
