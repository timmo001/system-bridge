package logging

import "log/slog"

// LogLevel is a dynamic log level variable that can be changed at runtime
var LogLevel = new(slog.LevelVar)

// SetLogLevel updates the log level for all handlers at runtime
func SetLogLevel(level slog.Level) {
	LogLevel.Set(level)
	slog.Info("Log level updated", "level", level.String())
}
