package tray

import (
	_ "embed"
	"log/slog"
	"runtime"
	"sync"

	"fyne.io/systray"
)

//go:embed icon.png
var trayIconPngData []byte

//go:embed icon.ico
var trayIconIcoData []byte

// Handlers holds the callback functions for tray menu actions
type Handlers struct {
	OpenWebClient func()
	OpenLogsDir   func()
	Quit          func()
}

var (
	handlers   Handlers
	handlersMu sync.RWMutex
)

// SetHandlers registers callbacks for tray menu actions.
// This should be called from main after all components are initialized.
func SetHandlers(h Handlers) {
	handlersMu.Lock()
	defer handlersMu.Unlock()
	handlers = h
}

// getHandlers safely retrieves the current handlers
func getHandlers() Handlers {
	handlersMu.RLock()
	defer handlersMu.RUnlock()
	return handlers
}

// Run starts the system tray. This should be called in a goroutine.
func Run() {
	systray.Run(OnReady, OnExit)
}

// OnReady is called when the system tray is ready
func OnReady() {
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
				h := getHandlers()
				if h.OpenWebClient != nil {
					go h.OpenWebClient()
				} else {
					slog.Warn("OpenWebClient handler not registered")
				}
			case <-mOpenLogsDirectory.ClickedCh:
				h := getHandlers()
				if h.OpenLogsDir != nil {
					go h.OpenLogsDir()
				} else {
					slog.Warn("OpenLogsDir handler not registered")
				}
			case <-mQuit.ClickedCh:
				slog.Info("Quit menu item clicked")
				h := getHandlers()
				if h.Quit != nil {
					h.Quit()
				}
				systray.Quit()
				return
			}
		}
	}()
}

// OnExit is called when the system tray is exiting
func OnExit() {
	slog.Info("System tray exiting...")
}

// Quit exits the system tray
func Quit() {
	systray.Quit()
}
