package main

import (
	"context"
	"os"

	"github.com/charmbracelet/log"

	"github.com/timmo001/system-bridge/backend"
	"github.com/timmo001/system-bridge/settings"
	"github.com/urfave/cli/v3"
)

func main() {
	log.Info("------ System Bridge ------")

	s, err := settings.Load()
	if err != nil {
		log.Fatalf("error: %v", err)
	}

	log.Debugf("Loaded settings: %v", s)

	cmd := &cli.Command{
		Name:  "System Bridge",
		Usage: "A bridge for your systems",
		Commands: []*cli.Command{
			{
				Name:    "backend",
				Aliases: []string{"b"},
				Usage:   "Run the backend server",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					return backend.Run()
				},
			},
		},
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		log.Fatalf("error running cmd: %v", err)
	}

	log.Info("------ Exiting ------")
}
