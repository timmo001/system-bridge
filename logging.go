package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"log/slog"

	"github.com/getsentry/sentry-go"
	sentryslog "github.com/getsentry/sentry-go/slog"
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

func setupLogging() {
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

	settings, err := settings.Load()
	if err != nil {
		slog.Error("error loading settings", "err", err)
	}

	ctx := context.Background()

	// Sentry handler
	sentryHandler := sentryslog.Option{
		EventLevel: []slog.Level{slog.LevelError},
		LogLevel:   []slog.Level{slog.LevelWarn, slog.LevelInfo, slog.LevelDebug},
	}.NewSentryHandler(ctx)

	// Terminal handler (colorized)
	terminalHandler := console.NewHandler(os.Stdout, &console.HandlerOptions{
		Level: settings.LogLevel,
	})

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
		Level: settings.LogLevel,
	})

	// Use custom multiHandler
	logger := slog.New(&multiHandler{handlers: []slog.Handler{
		sentryHandler,
		terminalHandler,
		fileHandler,
	}})
	slog.SetDefault(logger)
}
