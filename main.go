package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"log/slog"

	"fyne.io/systray"
	"github.com/getsentry/sentry-go"
	"github.com/pkg/browser"

	"github.com/timmo001/system-bridge/backend"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/discovery"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
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

func main() {
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

	// Note: systray is started only for the backend command to avoid
	// spawning a tray when using CLI-only commands.

	cmd := &cli.Command{
		Name:    "System Bridge",
		Usage:   "A bridge for your systems",
		Version: version.Version,
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
					// Start the system tray UI
					go systray.Run(onReady, onExit)
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
					{
						Name:    "discovery",
						Aliases: []string{"disc"},
						Usage:   "Service discovery commands",
						Commands: []*cli.Command{
							{
								Name:  "list",
								Usage: "List discovered services",
								Action: func(cmdCtx context.Context, cmd *cli.Command) error {
									discoveryManager := discovery.NewDiscoveryManager(utils.GetPort())
									if err := discoveryManager.Start(); err != nil {
										return fmt.Errorf("failed to start discovery manager: %w", err)
									}
									defer func() {
										if err := discoveryManager.Stop(); err != nil {
											fmt.Fprintf(os.Stderr, "Error stopping discovery manager: %v\n", err)
										}
									}()

									// Wait a moment for services to be discovered
									time.Sleep(2 * time.Second)

									services, err := discoveryManager.DiscoverServices()
									if err != nil {
										return fmt.Errorf("failed to discover services: %w", err)
									}

									if len(services) == 0 {
										fmt.Println("No services discovered")
										return nil
									}

									fmt.Printf("Discovered %d services:\n", len(services))
									for _, service := range services {
										fmt.Printf("- %s (%s:%d) [%s]\n", service.Hostname, service.IP, service.Port, service.Type)
									}

									return nil
								},
							},
						},
					},
					{
						Name:    "data",
						Aliases: []string{"d"},
						Usage:   "List and run data modules",
						Commands: []*cli.Command{
							{
								Name:  "list",
								Usage: "List available data modules",
								Action: func(cmdCtx context.Context, cmd *cli.Command) error {
									dataStore, err := data.NewDataStore()
									if err != nil {
										return fmt.Errorf("failed to create data store: %w", err)
									}

									updaters := dataStore.GetRegisteredModules()
									modules := make([]string, 0, len(updaters))
									for _, u := range updaters {
										if u != nil {
											modules = append(modules, string(u.Name()))
										}
									}

									// Stable output order
									// No need to import sort explicitly; json.Marshal of slice preserves order
									for _, name := range modules {
										fmt.Println(name)
									}
									return nil
								},
							},
							{
								Name:  "run",
								Usage: "Run a data module and print JSON output",
								Flags: []cli.Flag{
									&cli.StringFlag{
										Name:     "module",
										Aliases:  []string{"m"},
										Usage:    "Module name (e.g. cpu, memory). Use --all to run all.",
										Required: false,
									},
									&cli.BoolFlag{
										Name:  "all",
										Usage: "Run all modules and print a JSON object",
										Value: false,
									},
									&cli.BoolFlag{
										Name:  "pretty",
										Usage: "Pretty-print JSON output",
										Value: false,
									},
								},
								Action: func(cmdCtx context.Context, cmd *cli.Command) error {
									runAll := cmd.Bool("all")
									moduleName := cmd.String("module")
									pretty := cmd.Bool("pretty")

									if !runAll && moduleName == "" {
										return fmt.Errorf("either --module or --all must be provided")
									}

									dataStore, err := data.NewDataStore()
									if err != nil {
										return fmt.Errorf("failed to create data store: %w", err)
									}

									if runAll {
										result := make(map[string]any)
										for _, u := range dataStore.GetRegisteredModules() {
											if u == nil {
												continue
											}
											d, err := u.Update(cmdCtx)
											if err != nil {
												slog.Warn("module update failed", "module", u.Name(), "err", err)
												continue
											}
											result[string(u.Name())] = d
										}
										var out []byte
										if pretty {
											out, err = json.MarshalIndent(result, "", "  ")
										} else {
											out, err = json.Marshal(result)
										}
										if err != nil {
											return fmt.Errorf("failed to marshal result: %w", err)
										}
										fmt.Println(string(out))
										return nil
									}

									// Single module
									mod, err := dataStore.GetModule(types.ModuleName(moduleName))
									if err != nil {
										return fmt.Errorf("failed to get module %q: %w", moduleName, err)
									}
									if mod.Updater == nil {
										return fmt.Errorf("module %q has no updater registered", moduleName)
									}
									d, err := mod.Updater.Update(cmdCtx)
									if err != nil {
										return fmt.Errorf("module %q update failed: %w", moduleName, err)
									}
									var out []byte
									if pretty {
										out, err = json.MarshalIndent(d, "", "  ")
									} else {
										out, err = json.Marshal(d)
									}
									if err != nil {
										return fmt.Errorf("failed to marshal output: %w", err)
									}
									fmt.Println(string(out))
									return nil
								},
							},
						},
					},
				},
			},
			{
				Name:  "version",
				Usage: "Show the version of the application",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					fmt.Println(version.APIVersion())
					return nil
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
