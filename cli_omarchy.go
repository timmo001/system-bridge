package main

import (
	"context"
	"fmt"
	"slices"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/urfave/cli/v3"
)

func omarchyCommand() *cli.Command {
	// action reads the action and id a menu or panel command is given
	action := func(cmd *cli.Command, idRequired bool) (map[string]any, error) {
		action, id := cmd.Args().Get(0), cmd.Args().Get(1)
		if !slices.Contains([]string{"close", "open", "toggle"}, action) {
			return nil, fmt.Errorf("an action of open, close or toggle is required")
		}
		if id == "" && idRequired {
			return nil, fmt.Errorf("an id is required")
		}
		return map[string]any{"action": action, "id": id}, nil
	}

	return &cli.Command{
		Name:  "omarchy",
		Usage: "Open, close or toggle the Omarchy shell's menu and panels",
		Commands: []*cli.Command{
			{
				Name:      "menu",
				Usage:     "Open, close or toggle the Omarchy menu at one of its routes",
				ArgsUsage: "<open|close|toggle> [menu id]",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					data, err := action(cmd, cmd.Args().First() != "close")
					if err != nil {
						return err
					}
					return client.Send(cmdCtx, event.EventOmarchyMenu, data)
				},
			},
			{
				Name:      "panel",
				Usage:     "Open, close or toggle a panel or overlay",
				ArgsUsage: "<open|close|toggle> <panel id>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					data, err := action(cmd, true)
					if err != nil {
						return err
					}
					return client.Send(cmdCtx, event.EventOmarchyPanel, data)
				},
			},
		},
	}
}
