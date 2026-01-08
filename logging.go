package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"log/slog"

	"github.com/natefinch/lumberjack"
	console "github.com/phsym/console-slog"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/logging"
)

// multiHandler fans out records to multiple slog.Handlers
// It is not part of slog, so we define it here.
type multiHandler struct {
	handlers []slog.Handler
}

func (m *multiHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, h := range m.handlers {
		if h.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (m *multiHandler) Handle(ctx context.Context, r slog.Record) error {
	var firstErr error
	for _, h := range m.handlers {
		if h.Enabled(ctx, r.Level) {
			err := h.Handle(ctx, r)
			if err != nil && firstErr == nil {
				firstErr = err
			}
		}
	}
	return firstErr
}

func (m *multiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newHandlers := make([]slog.Handler, len(m.handlers))
	for i, h := range m.handlers {
		newHandlers[i] = h.WithAttrs(attrs)
	}
	return &multiHandler{handlers: newHandlers}
}

func (m *multiHandler) WithGroup(name string) slog.Handler {
	newHandlers := make([]slog.Handler, len(m.handlers))
	for i, h := range m.handlers {
		newHandlers[i] = h.WithGroup(name)
	}
	return &multiHandler{handlers: newHandlers}
}

// CaptureFatalError is a helper function to log fatal errors and exit
func CaptureFatalError(err error, msg string, args ...any) {
	// Log the fatal error
	slog.Error(msg, append([]any{"err", err}, args...)...)

	// Exit with error code
	os.Exit(1)
}

func setupLogging() {

	settings, err := settings.Load()
	if err != nil {
		slog.Error("error loading settings", "err", err)
	}

	// Initialize the dynamic log level from settings
	logging.LogLevel.Set(settings.LogLevel.ToSlogLevel())

	// Determine whether to log to stdout (only for backend command)
	includeTerminal := shouldLogToStdout()

	// Terminal handler (colorized) - only created if needed
	var terminalHandler slog.Handler
	if includeTerminal {
		terminalHandler = console.NewHandler(os.Stdout, &console.HandlerOptions{
			Level: logging.LogLevel,
		})
	}

	// File handler with rolling logs
	configDir, err := utils.GetConfigPath()
	if err != nil {
		panic(fmt.Errorf("failed to get config path: %w", err))
	}
	logFile := filepath.Join(configDir, "system-bridge.log")
	fileLogger := &lumberjack.Logger{
		Filename:   logFile,
		MaxSize:    10, // megabytes
		MaxBackups: 3,
		MaxAge:     28, // days
		Compress:   true,
	}
	fileHandler := slog.NewTextHandler(fileLogger, &slog.HandlerOptions{
		Level: logging.LogLevel,
	})

	// Collect handlers
	var handlers []slog.Handler
	if includeTerminal && terminalHandler != nil {
		handlers = append(handlers, terminalHandler)
	}
	handlers = append(handlers, fileHandler)

	logger := slog.New(&multiHandler{handlers: handlers})
	slog.SetDefault(logger)
}

// shouldLogToStdout returns true when the application should emit logs to stdout.
// We only log to stdout for the `backend` command to avoid polluting CLI output
// (e.g. JSON) for `client` commands.
func shouldLogToStdout() bool {
	// Expect subcommand in os.Args[1]
	if len(os.Args) < 2 {
		// Default to true when no subcommand is provided
		return true
	}
	// Prefer explicit checks for known top-level commands and their aliases
	for _, arg := range os.Args[1:] {
		switch arg {
		case "client", "c", "cli":
			return false
		case "backend", "b":
			return true
		}
		// Stop scanning after first non-flag token
		if len(arg) > 0 && arg[0] != '-' {
			// If it's an unknown subcommand, default to true to aid debugging
			return true
		}
	}
	return true
}
