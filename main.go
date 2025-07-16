package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"github.com/charmbracelet/log"
	"github.com/getlantern/systray"
	"github.com/pkg/browser"

	"github.com/timmo001/system-bridge/backend"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/notification"
	"github.com/urfave/cli/v3"
)

//go:embed web-client/out/*
var webClientContent embed.FS

//go:embed .resources/system-bridge-dimmed-512.png
var trayIconPngData []byte

//go:embed .resources/system-bridge-dimmed.ico
var trayIconIcoData []byte

func main() {
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

	go func() {
		systray.Run(onReady, onExit)
	}()

	cmd := &cli.Command{
		Name:  "System Bridge",
		Usage: "A bridge for your systems",
		Commands: []*cli.Command{
			{
				Name:    "backend",
				Aliases: []string{"b"},
				Usage:   "Run the backend server",
				Flags: []cli.Flag{
					&cli.BoolFlag{
						Name:  "open-web-client",
						Usage: "Open the web client in the default browser",
					},
				},
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					log.Info("------ System Bridge ------")

					s, err := settings.Load()
					if err != nil {
						return fmt.Errorf("error loading settings: %w", err)
					}

					log.Debugf("Loaded settings: %v", s)

					token, err := utils.LoadToken()
					if err != nil {
						return fmt.Errorf("error loading token: %w", err)
					}

					log.Infof("Your API token is: %s", token)

					// Setup data store
					dataStore, err := data.NewDataStore()
					if err != nil {
						return fmt.Errorf("failed to create data store: %w", err)
					}

					// Create and run backend server with signal-aware context
					b := backend.New(s, dataStore, token, &webClientContent)

					// Show startup notification if requested
					if cmd.Bool("open-web-client") {
						openWebClient(token)
					}

					return b.Run(cmdCtx)
				},
			},
			{
				Name:    "client",
				Aliases: []string{"c", "cli"},
				Usage:   "Run the client",
				// Action: func(cmdCtx context.Context, cmd *cli.Command) error {
				// 	// TODO: CLI client
				// 	// -- Access the data store
				// 	// -- Access event router
				// 	return nil
				// },
				Commands: []*cli.Command{
					{
						Name:    "notification",
						Aliases: []string{"notify", "n"},
						Usage:   "Send a notification",
						Flags: []cli.Flag{
							&cli.StringFlag{
								Name:  "title",
								Usage: "The title of the notification",
								Value: "System Bridge",
							},
							&cli.StringFlag{
								Name:  "message",
								Usage: "The message of the notification",
								Value: "Hello, world!",
							},
							&cli.StringFlag{
								Name:  "icon",
								Usage: "The icon of the notification",
								Value: "system-bridge",
							},
						},
						Action: func(cmdCtx context.Context, cmd *cli.Command) error {
							err := notification.Send(notification.NotificationData{
								Title:   cmd.String("title"),
								Message: cmd.String("message"),
								Icon:    cmd.String("icon"),
							})
							if err != nil {
								log.Warnf("Failed to send notification: %v", err)
							}
							return nil
						},
					},
				},
			},
		},
	}

	if err := cmd.Run(ctx, os.Args); err != nil {
		// Stop systray if it was started – avoids leaving background goroutine active
		systray.Quit()
		log.Errorf("error running cmd: %v", err)
		os.Exit(1)
	}
}

func onReady() {
	token, err := utils.LoadToken()
	if err != nil {
		log.Errorf("error loading token: %v", err)
		token = utils.GenerateToken()
		if saveErr := utils.SaveToken(token); saveErr != nil {
			log.Fatalf("failed to persist generated token: %v", saveErr)
		}
	}

	// Set tray icon based on OS
	if runtime.GOOS == "windows" {
		systray.SetIcon(trayIconIcoData)
	} else {
		systray.SetIcon(trayIconPngData)
	}
	systray.SetTitle("System Bridge")

	// Open frontend
	mOpenWebClient := systray.AddMenuItem("Open web client", "Open the web client in the default browser")
	go func() {
		<-mOpenWebClient.ClickedCh
		openWebClient(token)
	}()

	// ---
	systray.AddSeparator()

	// Quit
	mQuit := systray.AddMenuItem("Quit", "Quit the application")
	go func() {
		<-mQuit.ClickedCh
		log.Info("Quitting...")
		os.Exit(0)
	}()
}

func onExit() {
	// Perform cleanup if needed
}

func openWebClient(token string) {
	// Open the frontend in the default browser
	host := "0.0.0.0"
	port := utils.GetPort()
	url := fmt.Sprintf("http://%s:%d/?host=%s&port=%d&apiKey=%s", host, port, host, port, token)
	log.Infof("Opening web client URL: %s", url)
	err := browser.OpenURL(url)
	if err != nil {
		log.Errorf("Failed to open web client URL: %v", err)
	}
}
