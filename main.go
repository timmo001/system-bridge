package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"log/slog"

	sentryslog "github.com/getsentry/sentry-go/slog"

	"fyne.io/systray"
	"github.com/getsentry/sentry-go"
	"github.com/pkg/browser"

	"github.com/timmo001/system-bridge/backend"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
	"github.com/timmo001/system-bridge/utils/handlers/notification"
	"github.com/timmo001/system-bridge/version"
	"github.com/urfave/cli/v3"
)

//go:embed web-client/out/*
var webClientContent embed.FS

//go:embed .resources/system-bridge-dimmed-512.png
var trayIconPngData []byte

//go:embed .resources/system-bridge-dimmed.ico
var trayIconIcoData []byte

func setupLogging() {
	ctx := context.Background()
	handler := sentryslog.Option{
		EventLevel: []slog.Level{slog.LevelError}, // Only Error level will be sent as events
		LogLevel:   []slog.Level{slog.LevelWarn, slog.LevelInfo, slog.LevelDebug}, // Warn, Info, Debug as logs
	}.NewSentryHandler(ctx)
	logger := slog.New(handler)
	slog.SetDefault(logger)
}

func main() {
	err := sentry.Init(sentry.ClientOptions{
		Dsn: "https://481e02051b173aec6b92b71018450191@o341827.ingest.us.sentry.io/4509689982877696",
		// Adds request headers and IP for users,
		// visit: https://docs.sentry.io/platforms/go/data-management/data-collected/ for more info
		SendDefaultPII: true,
		// Enable logs to be sent to Sentry
		EnableLogs: true,
		// Set Sentry release context
		Release: version.Version,
		// Add version tag to Sentry events
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			if event.Tags == nil {
				event.Tags = make(map[string]string)
			}
			event.Tags["version"] = version.Version
			return event
		},
	})
	if err != nil {
		slog.Error("sentry.Init", "err", err)
	}
	// Flush buffered events before the program terminates.
	// Set the timeout to the maximum duration the program can afford to wait.
	defer sentry.Flush(2 * time.Second)

	setupLogging()

	defer func() {
		if err := recover(); err != nil {
			sentry.CurrentHub().Recover(err)
			sentry.Flush(2 * time.Second)
		}
	}()

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
		slog.Info("Received signal", "signal", sig)
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
					slog.Info("------ System Bridge ------")

					s, err := settings.Load()
					if err != nil {
						return fmt.Errorf("error loading settings: %w", err)
					}

					slog.Debug("Loaded settings", "settings", s)

					token, err := utils.LoadToken()
					if err != nil {
						return fmt.Errorf("error loading token: %w", err)
					}

					slog.Info("Your API token is", "token", token)

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
								slog.Warn("Failed to send notification", "err", err)
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
		slog.Error("error running cmd", "err", err)
		os.Exit(1)
	}
}

func onReady() {
	token, err := utils.LoadToken()
	if err != nil {
		slog.Error("error loading token", "err", err)
		token = utils.GenerateToken()
		if saveErr := utils.SaveToken(token); saveErr != nil {
			slog.Error("failed to persist generated token", "err", saveErr)
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
	systray.AddSeparator()
	mOpenLogsDirectory := systray.AddMenuItem("Open logs directory", "Open the logs directory")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Quit the application")

	// Handle menu item clicks
	go func() {
		for {
			select {
			case <-mOpenWebClient.ClickedCh:
				go openWebClient(token)
			case <-mOpenLogsDirectory.ClickedCh:
				go openLogsDirectory()
			case <-mQuit.ClickedCh:
				slog.Info("Quitting...")
				systray.Quit()
				os.Exit(0)
			}
		}
	}()
}

func onExit() {
	// Cleanup if needed
	slog.Info("System tray exiting...")
}

func openWebClient(token string) {
	port := utils.GetPort()
	url := fmt.Sprintf("http://127.0.0.1:%d/?host=127.0.0.1&port=%d&apiKey=%s", port, port, token)
	slog.Info("Opening web client URL", "url", url)
	if err := browser.OpenURL(url); err != nil {
		if err := notification.Send(notification.NotificationData{
			Title:   "Failed to open web client",
			Message: "Failed to open web client in the default browser",
			Icon:    "system-bridge",
		}); err != nil {
			slog.Error("Failed to send notification", "err", err)
		}
		slog.Error("Failed to open web client", "err", err)
	}
}

func openLogsDirectory() {
	configDir, err := utils.GetConfigPath()
	if err != nil {
		slog.Error("error getting config path", "err", err)
		return
	}

	// Open the log file in the default editor
	if err := filesystem.OpenFile(configDir); err != nil {
		slog.Error("Failed to open logs directory", "err", err)
		if err := notification.Send(notification.NotificationData{
			Title:   "Failed to open logs directory",
			Message: "Failed to open logs directory",
			Icon:    "system-bridge",
		}); err != nil {
			slog.Error("Failed to send notification", "err", err)
		}
	}
}
