package main

import (
	"context"
	"embed"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
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

// dualWriter is a writer that writes to both console and file, stripping ANSI color codes for the file
var ansi = regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]`)

type dualWriter struct {
	console io.Writer
	file    io.Writer
}

func (w dualWriter) Write(p []byte) (n int, err error) {
	n, err = w.console.Write(p)
	plain := ansi.ReplaceAll(p, []byte(""))
	_, ferr := w.file.Write(plain)
	if err == nil {
		err = ferr
	}
	return
}

func setupLogging() *os.File {
	configDir, err := utils.GetConfigPath()
	var logFile *os.File
	if err == nil {
		logFilePath := filepath.Join(configDir, "system-bridge.log")

		// Check the log file is writable
		if _, err := os.Stat(logFilePath); os.IsNotExist(err) {
			log.Warnf("Log file does not exist, creating: %s", logFilePath)
			if err := os.WriteFile(logFilePath, []byte{}, 0666); err != nil {
				log.Warnf("Failed to create log file: %v", err)
			}
		} else if err != nil {
			log.Warnf("Failed to check log file: %v", err)
		} else {
			if err := os.Truncate(logFilePath, 0); err != nil {
				log.Warnf("Failed to truncate log file: %v", err)
			}
		}

		logFile, err = os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0666)
		if err == nil {
			log.SetOutput(dualWriter{console: os.Stdout, file: logFile})
		} else {
			log.SetOutput(os.Stdout)
			log.Warnf("Failed to log to file, using only stdout: %v", err)
		}
	} else {
		log.SetOutput(os.Stdout)
		log.Warnf("Failed to get config path for logging: %v", err)
	}

	return logFile
}

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
					logFile := setupLogging()
					defer logFile.Close()

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

func openLogsDirectory() {
	configDir, err := utils.GetConfigPath()
	if err != nil {
		log.Errorf("error getting config path: %v", err)
		return
	}

	// Open the log file in the default editor
	if err := filesystem.OpenFile(configDir); err != nil {
		log.Errorf("Failed to open logs directory: %v", err)
		if err := notification.Send(notification.NotificationData{
			Title:   "Failed to open logs directory",
			Message: "Failed to open logs directory",
			Icon:    "system-bridge",
		}); err != nil {
			log.Errorf("Failed to send notification: %v", err)
		}
	}
}
