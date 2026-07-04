package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"log/slog"

	"github.com/pkg/browser"
	"golang.org/x/term"

	"github.com/timmo001/system-bridge/backend"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/discovery"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/tray"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
	"github.com/timmo001/system-bridge/utils/handlers/notification"
	"github.com/timmo001/system-bridge/version"
	"github.com/urfave/cli/v3"
)

//go:embed all:web-client/dist/*
var webClientContent embed.FS

// Global notifier for the application
var appNotifier *notification.Notifier

func main() {
	setupLogging()

	defer func() {
		if err := recover(); err != nil {
			slog.Error("Panic recovered", "error", err)
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
		Name:                       "system-bridge",
		Usage:                      "A bridge for your systems",
		Description:                "Documentation: " + version.DocsCLIURL,
		Version:                    version.Version,
		EnableShellCompletion:      true,
		ShellCompletionCommandName: "completions",
		Action: func(cmdCtx context.Context, cmd *cli.Command) error {
			// When run interactively with no subcommand, launch the TUI
			if term.IsTerminal(int(os.Stdin.Fd())) {
				return launchTUI()
			}
			// Non-interactive: show help
			return cli.ShowAppHelp(cmd)
		},
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
					&cli.BoolFlag{
						Name:  "no-tray",
						Usage: "Disable the system tray icon",
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

					// Initialize the notifier with URL and path opening capability
					appNotifier, err = notification.NewNotifier(notification.NotifierOptions{
						AppName: "System Bridge",
						OpenURL: func(url string) error {
							return browser.OpenURL(url)
						},
						OpenPath: func(path string) error {
							return filesystem.OpenFile(path)
						},
					})
					if err != nil {
						slog.Warn("Failed to create notifier", "error", err)
						// Continue without notifier - notifications will fail gracefully
					} else {
						// Set as the default notifier so Send() uses it with action callbacks
						notification.SetDefaultNotifier(appNotifier)
					}
					defer func() {
						// Clear the default notifier before closing
						notification.SetDefaultNotifier(nil)
						if appNotifier != nil {
							if err := appNotifier.Close(); err != nil {
								slog.Error("Failed to close notifier", "error", err)
							}
						}
					}()

					if !cmd.Bool("no-tray") {
						// Set up tray handlers
						tray.SetHandlers(tray.Handlers{
							OpenWebClient: func() {
								openWebClient(token)
							},
							LaunchTUI: func() {
								launchTUIInTerminal()
							},
							OpenDocs: func() {
								openExternalURL(version.DocsURL, "documentation")
							},
							OpenLogsDir: func() {
								openLogsDirectory()
							},
							Quit: func() {
								slog.Info("Quitting...")
								// Cancel context to trigger graceful shutdown
								// The backend.Run() will return, allowing deferred cleanup to run
								cancel()
								// Quit the tray to unblock systray.Run()
								tray.Quit()
							},
						})

						// Start the system tray UI
						go tray.Run()
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
						Name:    "token",
						Aliases: []string{"t"},
						Usage:   "Print the API token",
						Action: func(cmdCtx context.Context, cmd *cli.Command) error {
							token, err := utils.LoadToken()
							if err != nil {
								return fmt.Errorf("error loading token: %w", err)
							}
							fmt.Println(token)
							return nil
						},
					},
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
							&cli.StringFlag{
								Name:  "sound",
								Usage: "Path to a sound file to play with the notification (Linux only)",
							},
							&cli.StringFlag{
								Name:  "action-url",
								Usage: "URL to open when notification is clicked (Linux only)",
							},
							&cli.StringFlag{
								Name:  "action-path",
								Usage: "File/folder path to open when notification is clicked (Linux only)",
							},
						},
						Action: func(cmdCtx context.Context, cmd *cli.Command) error {
							err := notification.Send(notification.NotificationData{
								Title:      cmd.String("title"),
								Message:    cmd.String("message"),
								Icon:       cmd.String("icon"),
								Sound:      cmd.String("sound"),
								ActionURL:  cmd.String("action-url"),
								ActionPath: cmd.String("action-path"),
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
								Flags: []cli.Flag{
									&cli.BoolFlag{
										Name:  "json",
										Usage: "Output as JSON array",
									},
									&cli.BoolFlag{
										Name:  "table",
										Usage: "Output as table (default)",
									},
								},
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

									// Output format selection using --json or --table
									if cmd.Bool("json") && !cmd.Bool("table") {
										out, err := json.Marshal(modules)
										if err != nil {
											return fmt.Errorf("failed to marshal modules: %w", err)
										}
										fmt.Println(string(out))
										return nil
									}
									// Default: table (or if --table specified)
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
								ShellComplete: func(cmdCtx context.Context, cmd *cli.Command) {
									// Complete --module with available data module names
									args := os.Args
									if len(args) >= 2 {
										prev := args[len(args)-2]
										if prev == "--module" || prev == "-m" {
											dataStore, err := data.NewDataStore()
											if err != nil {
												return
											}
											for _, u := range dataStore.GetRegisteredModules() {
												if u != nil {
													_, _ = fmt.Fprintln(cmd.Root().Writer, string(u.Name()))
												}
											}
											return
										}
									}
									cli.DefaultCompleteWithFlags(cmdCtx, cmd)
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
			{
				Name:    "tui",
				Aliases: []string{"t"},
				Usage:   "Launch the interactive TUI",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					return launchTUI(cmd.Args().Slice()...)
				},
			},
		},
	}

	cli.VersionPrinter = func(cmd *cli.Command) {
		fmt.Printf("%s version %s\n", cmd.Name, cmd.Version)
		fmt.Printf("Documentation: %s\n", version.DocsCLIURL)
	}

	if err := cmd.Run(ctx, os.Args); err != nil {
		tray.Quit()
		slog.Error("error running cmd", "err", err)
		os.Exit(1)
	}
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

// openExternalURL opens a URL in the default browser, notifying on failure.
func openExternalURL(url, label string) {
	slog.Info("Opening URL", "url", url, "label", label)
	if err := browser.OpenURL(url); err != nil {
		if err := notification.Send(notification.NotificationData{
			Title:   "Failed to open " + label,
			Message: "Failed to open the " + label + " in the default browser",
			Icon:    "system-bridge",
		}); err != nil {
			slog.Error("Failed to send notification", "err", err)
		}
		slog.Error("Failed to open URL", "label", label, "err", err)
	}
}

func openLogsDirectory() {
	logsDir, err := utils.GetLogsPath()
	if err != nil {
		slog.Error("error getting logs path", "err", err)
		return
	}

	if err := filesystem.OpenFile(logsDir); err != nil {
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

// findTUIBinary locates the system-bridge-tui binary, checking next to the
// current executable first, then falling back to PATH.
func findTUIBinary() (string, error) {
	tuiName := "system-bridge-tui"
	if runtime.GOOS == "windows" {
		tuiName = "system-bridge-tui.exe"
	}

	// Look next to the current executable
	if exe, err := os.Executable(); err == nil {
		candidate := filepath.Join(filepath.Dir(exe), tuiName)
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}

	// Fall back to PATH lookup
	tuiPath, err := exec.LookPath(tuiName)
	if err != nil {
		return "", fmt.Errorf("%s not found (build with 'mise run build:tui'): %w", tuiName, err)
	}
	return tuiPath, nil
}

// launchTUI finds and exec's the system-bridge-tui binary, attaching the
// current process's stdio. Used for interactive CLI invocation.
func launchTUI(args ...string) error {
	tuiPath, err := findTUIBinary()
	if err != nil {
		return err
	}

	cmd := exec.Command(tuiPath, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// launchTUIInTerminal opens the system-bridge-tui binary inside a new terminal
// window. Used by the system tray, which has no terminal of its own.
func launchTUIInTerminal() {
	tuiPath, err := findTUIBinary()
	if err != nil {
		slog.Error("Failed to find TUI binary", "err", err)
		notifyTUILaunchFailed()
		return
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		// start "" opens a new console window running the binary
		cmd = exec.Command("cmd", "/c", "start", "", tuiPath)
	case "darwin":
		// open -a Terminal runs the binary in a new Terminal.app window
		cmd = exec.Command("open", "-a", "Terminal", tuiPath)
	default:
		c, ok := linuxTerminalCommand(tuiPath)
		if !ok {
			slog.Error("No terminal emulator found to launch TUI")
			notifyTUILaunchFailed()
			return
		}
		cmd = c
	}

	if err := cmd.Start(); err != nil {
		slog.Error("Failed to launch TUI in terminal", "err", err)
		notifyTUILaunchFailed()
	}
}

// linuxTerminals lists known terminal emulators in priority order, along with
// how to invoke each to run a program in a new window. The arg builders account
// for the differing flags terminals use (-e, --, direct program, etc).
var linuxTerminals = []struct {
	name string
	args func(prog string) []string
}{
	{"x-terminal-emulator", func(p string) []string { return []string{"-e", p} }},
	{"alacritty", func(p string) []string { return []string{"-e", p} }},
	{"ghostty", func(p string) []string { return []string{"-e", p} }},
	{"kitty", func(p string) []string { return []string{p} }},
	{"foot", func(p string) []string { return []string{p} }},
	{"wezterm", func(p string) []string { return []string{"start", "--", p} }},
	{"konsole", func(p string) []string { return []string{"-e", p} }},
	{"gnome-terminal", func(p string) []string { return []string{"--", p} }},
	{"xfce4-terminal", func(p string) []string { return []string{"-x", p} }},
	{"xterm", func(p string) []string { return []string{"-e", p} }},
}

// linuxTerminalCommand builds a command to run prog in a new terminal window,
// honoring $TERMINAL when set and otherwise falling back to known emulators.
func linuxTerminalCommand(prog string) (*exec.Cmd, bool) {
	if t := os.Getenv("TERMINAL"); t != "" {
		base := filepath.Base(t)
		for _, term := range linuxTerminals {
			if term.name == base {
				if path, err := exec.LookPath(t); err == nil {
					return exec.Command(path, term.args(prog)...), true
				}
			}
		}
		// Unknown $TERMINAL: best-effort -e.
		if path, err := exec.LookPath(t); err == nil {
			return exec.Command(path, "-e", prog), true
		}
	}

	for _, term := range linuxTerminals {
		if path, err := exec.LookPath(term.name); err == nil {
			return exec.Command(path, term.args(prog)...), true
		}
	}
	return nil, false
}

// notifyTUILaunchFailed sends a desktop notification when the TUI cannot be
// launched from the system tray.
func notifyTUILaunchFailed() {
	if err := notification.Send(notification.NotificationData{
		Title:   "Failed to launch TUI",
		Message: "Could not open the TUI in a terminal window",
		Icon:    "system-bridge",
	}); err != nil {
		slog.Error("Failed to send notification", "err", err)
	}
}
