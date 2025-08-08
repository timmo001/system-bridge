package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"log/slog"

	"github.com/getsentry/sentry-go"
	"github.com/natefinch/lumberjack"
	console "github.com/phsym/console-slog"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/version"
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

// CaptureFatalError is a helper function to capture fatal errors and exit
func CaptureFatalError(err error, msg string, args ...any) {
	// Capture the error in Sentry
	sentry.CaptureException(err)

	// Log the fatal error
	slog.Error(msg, append([]any{"err", err}, args...)...)

	// Flush Sentry before exiting
	sentry.Flush(2 * time.Second)

	// Exit with error code
	os.Exit(1)
}

// errorHandler captures error and fatal level logs as Sentry exceptions
type errorHandler struct {
	handler slog.Handler
}

func (h *errorHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.handler.Enabled(ctx, level)
}

func (h *errorHandler) Handle(ctx context.Context, r slog.Record) error {
	// Capture error and fatal levels as Sentry exceptions
	if r.Level >= slog.LevelError {
		// Create a Sentry event from the log record
		event := &sentry.Event{
			Level:   sentry.LevelError,
			Message: r.Message,
			Tags: map[string]string{
				"level": r.Level.String(),
			},
		}

		// Add attributes as extra data
		if r.NumAttrs() > 0 {
			event.Extra = make(map[string]interface{})
			r.Attrs(func(attr slog.Attr) bool {
				event.Extra[attr.Key] = attr.Value.Any()
				return true
			})
		}

		// Capture the exception
		sentry.CaptureEvent(event)

		// For fatal level, also capture as exception with stack trace
		if r.Level >= slog.LevelError+1 { // Fatal level is typically Error+1
			sentry.CaptureException(fmt.Errorf("fatal error: %s", r.Message))
		}
	}

	// Pass through to the underlying handler
	return h.handler.Handle(ctx, r)
}

func (h *errorHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &errorHandler{handler: h.handler.WithAttrs(attrs)}
}

func (h *errorHandler) WithGroup(name string) slog.Handler {
	return &errorHandler{handler: h.handler.WithGroup(name)}
}

func setupLogging() {
	err := sentry.Init(sentry.ClientOptions{
		Dsn: "https://481e02051b173aec6b92b71018450191@o341827.ingest.us.sentry.io/4509689982877696",
		// Adds request headers and IP for users,
		// visit: https://docs.sentry.io/platforms/go/data-management/data-collected/ for more info
		SendDefaultPII: true,
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

	settings, err := settings.Load()
	if err != nil {
		slog.Error("error loading settings", "err", err)
	}

	// Convert LogLevel to slog.Level
	logLevel := settings.LogLevel.ToSlogLevel()

	// Determine whether to log to stdout (only for backend command)
	includeTerminal := shouldLogToStdout()

	// Terminal handler (colorized) - only created if needed
	var terminalHandler slog.Handler
	if includeTerminal {
		terminalHandler = console.NewHandler(os.Stdout, &console.HandlerOptions{
			Level: logLevel,
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
		Level: logLevel,
	})

	// Wrap handlers with error capture
	var handlers []slog.Handler
	if includeTerminal && terminalHandler != nil {
		handlers = append(handlers, &errorHandler{handler: terminalHandler})
	}
	handlers = append(handlers, &errorHandler{handler: fileHandler})

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
