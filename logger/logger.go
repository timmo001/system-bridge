package logger

import (
	"os"
	"time"

	"github.com/charmbracelet/log"
)

func CreateLogger(prefix string) *log.Logger {
	// Get logLevel from environment
	logLevel, err := log.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil {
		logLevel = log.DebugLevel
	}

	return log.NewWithOptions(os.Stderr, log.Options{
		ReportCaller:    true,
		ReportTimestamp: true,
		TimeFormat:      time.DateTime,
		Prefix:          prefix,
		Level:           logLevel,
	})
}
