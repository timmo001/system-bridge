package main

import (
	"context"
	"embed"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"

	"fyne.io/systray"
	"github.com/charmbracelet/log"
	"github.com/pkg/browser"

	"github.com/timmo001/system-bridge/backend"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
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

	// Run systray in a goroutine
	go systray.Run(onReady, onExit)

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
					// Setup file and console logging
					configDir, err := utils.GetConfigPath()
					if err == nil {
						logFilePath := filepath.Join(configDir, "system-bridge.log")
						logFile, fileErr := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0666)
						if fileErr == nil {
							log.SetOutput(io.MultiWriter(os.Stdout, logFile))
						} else {
							log.SetOutput(os.Stdout)
							log.Warnf("Failed to log to file, using only stdout: %v", fileErr)
						}
					} else {
						log.SetOutput(os.Stdout)
						log.Warnf("Failed to get config path for logging: %v", err)
					}

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

	// Set systray icon based on OS
	if runtime.GOOS == "windows" {
		systray.SetIcon(trayIconIcoData)
	} else {
		systray.SetIcon(trayIconPngData)
	}

	systray.SetTitle("System Bridge")
	systray.SetTooltip("System Bridge")

	// Create menu items
	mOpenWebClient := systray.AddMenuItem("Open web client", "Open the web client in your default browser")
	mOpenLogs := systray.AddMenuItem("Open logs", "Open the logs in the default editor")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Quit the application")

	// Handle menu item clicks
	go func() {
		for {
			select {
			case <-mOpenWebClient.ClickedCh:
				openWebClient(token)
			case <-mOpenLogs.ClickedCh:
				openLogs()
			case <-mQuit.ClickedCh:
				log.Info("Quitting...")
				systray.Quit()
				os.Exit(0)
			}
		}
	}()
}

func onExit() {
	// Cleanup if needed
	log.Info("System tray exiting...")
}

func openWebClient(token string) {
	port := utils.GetPort()
	url := fmt.Sprintf("http://127.0.0.1:%d/?host=127.0.0.1&port=%d&apiKey=%s", port, port, token)
	log.Infof("Opening web client URL: %s", url)
	if err := browser.OpenURL(url); err != nil {
		if err := notification.Send(notification.NotificationData{
			Title:   "Failed to open web client",
			Message: "Failed to open web client in the default browser",
			Icon:    "system-bridge",
		}); err != nil {
			log.Errorf("Failed to send notification: %v", err)
		}
		log.Errorf("Failed to open web client: %v", err)
	}
}

func openLogs() {
	configDir, err := utils.GetConfigPath()
	if err != nil {
		log.Errorf("error getting config path: %v", err)
		return
	}

	logFilePath := filepath.Join(configDir, "system-bridge.log")

	// Open the log file in the default editor
	if err := filesystem.OpenFile(logFilePath); err != nil {
		if err := notification.Send(notification.NotificationData{
			Title:   "Failed to open logs",
			Message: "Failed to open logs in the default editor",
			Icon:    "system-bridge",
		}); err != nil {
			log.Errorf("Failed to send notification: %v", err)
		}
		log.Errorf("Failed to open logs: %v", err)
	}
}
