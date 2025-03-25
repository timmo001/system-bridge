package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/charmbracelet/log"

	"github.com/timmo001/system-bridge/backend"
	"github.com/timmo001/system-bridge/settings"
	"github.com/urfave/cli/v3"
)

func main() {
	log.Info("------ System Bridge ------")

	// Create a channel to receive OS signals
	sigChan := make(chan os.Signal, 1)
	// Register for SIGINT (Ctrl+C) and SIGTERM
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Create a context that will be canceled on signal
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle signals in a goroutine
	go func() {
		sig := <-sigChan
		log.Infof("Received signal: %v", sig)
		cancel() // Cancel the context
	}()

	s, err := settings.Load()
	if err != nil {
		log.Fatalf("error loading settings: %v", err)
	}

	log.Debugf("Loaded settings: %v", s)

	log.Infof("Your API token is: %s", s.API.Token)

	cmd := &cli.Command{
		Name:  "System Bridge",
		Usage: "A bridge for your systems",
		Commands: []*cli.Command{
			{
				Name:    "backend",
				Aliases: []string{"b"},
				Usage:   "Run the backend server",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					// Create and run backend server with signal-aware context
					b := backend.New(s)
					return b.Run(cmdCtx)
				},
			},
		},
	}

	if err := cmd.Run(ctx, os.Args); err != nil {
		log.Fatalf("error running cmd: %v", err)
	}

	log.Info("------ Exiting ------")
}
