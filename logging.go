package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"log/slog"

	console "github.com/phsym/console-slog"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
	"github.com/timmo001/system-bridge/utils/logging"
)

const logRetention = 7 * 24 * time.Hour
const logFilePermissions os.FileMode = 0600
const dailyLogFileLayout = "2006-01-02"

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

	logFile, err := openLogFile(time.Now())
	if err != nil {
		panic(fmt.Errorf("failed to open log file: %w", err))
	}
	fileHandler := slog.NewTextHandler(logFile, &slog.HandlerOptions{
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

func openLogFile(now time.Time) (*os.File, error) {
	logPath, err := utils.GetLogFilePath(now)
	if err != nil {
		return nil, err
	}

	if err := migrateLegacyLogFile(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to migrate legacy log file: %v\n", err)
	}

	if err := cleanupOldLogFiles(filepath.Dir(logPath), now, logRetention); err != nil {
		fmt.Fprintf(os.Stderr, "failed to clean up old log files: %v\n", err)
	}

	file, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, logFilePermissions)
	if err != nil {
		return nil, err
	}
	if err := file.Chmod(logFilePermissions); err != nil {
		closeErr := file.Close()
		if closeErr != nil {
			return nil, errors.Join(err, closeErr)
		}
		return nil, err
	}

	return file, nil
}

func migrateLegacyLogFile() error {
	configPath, err := utils.GetConfigPath()
	if err != nil {
		return err
	}

	legacyLogPath := filepath.Join(configPath, "system-bridge.log")
	legacyInfo, err := os.Stat(legacyLogPath)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	if legacyInfo.IsDir() {
		return fmt.Errorf("legacy log path is a directory: %s", legacyLogPath)
	}

	targetLogPath, err := utils.GetLogFilePath(legacyInfo.ModTime())
	if err != nil {
		return err
	}
	if filepath.Clean(legacyLogPath) == filepath.Clean(targetLogPath) {
		return nil
	}

	return appendFileAndRemoveSource(legacyLogPath, targetLogPath)
}

func appendFileAndRemoveSource(sourcePath, targetPath string) (err error) {
	sourceFile, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := sourceFile.Close(); closeErr != nil && err == nil {
			err = closeErr
		}
	}()

	targetFile, err := os.OpenFile(targetPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, logFilePermissions)
	if err != nil {
		return err
	}
	if chmodErr := targetFile.Chmod(logFilePermissions); chmodErr != nil {
		closeErr := targetFile.Close()
		if closeErr != nil {
			return errors.Join(chmodErr, closeErr)
		}
		return chmodErr
	}
	defer func() {
		if closeErr := targetFile.Close(); closeErr != nil && err == nil {
			err = closeErr
		}
	}()

	if _, err := io.Copy(targetFile, sourceFile); err != nil {
		return err
	}

	if err := os.Remove(sourcePath); err != nil {
		return err
	}

	return nil
}

func cleanupOldLogFiles(logDir string, now time.Time, retention time.Duration) error {
	entries, err := os.ReadDir(logDir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() || !isManagedLogFile(entry.Name()) {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			return err
		}
		if now.Sub(info.ModTime()) <= retention {
			continue
		}

		if err := os.Remove(filepath.Join(logDir, entry.Name())); err != nil {
			return err
		}
	}

	return nil
}

func isManagedLogFile(name string) bool {
	const managedLogNameLength = len(dailyLogFileLayout) + len(".log")

	if len(name) != managedLogNameLength || filepath.Ext(name) != ".log" {
		return false
	}

	datePart := name[:len(dailyLogFileLayout)]
	parsed, err := time.Parse(dailyLogFileLayout, datePart)
	if err != nil {
		return false
	}

	return parsed.Format(dailyLogFileLayout) == datePart
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
