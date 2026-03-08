package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCleanupOldLogFiles(t *testing.T) {
	logDir := t.TempDir()
	now := time.Date(2026, time.March, 8, 12, 0, 0, 0, time.UTC)

	oldLogPath := filepath.Join(logDir, "2026-02-28.log")
	recentLogPath := filepath.Join(logDir, "2026-03-05.log")
	nonLogPath := filepath.Join(logDir, "notes.txt")

	for _, path := range []string{oldLogPath, recentLogPath, nonLogPath} {
		file, err := os.Create(path)
		require.NoError(t, err)
		require.NoError(t, file.Close())
	}

	oldTime := now.Add(-(7*24*time.Hour + time.Minute))
	recentTime := now.Add(-48 * time.Hour)
	require.NoError(t, os.Chtimes(oldLogPath, oldTime, oldTime))
	require.NoError(t, os.Chtimes(recentLogPath, recentTime, recentTime))

	require.NoError(t, cleanupOldLogFiles(logDir, now, 7*24*time.Hour))

	assert.NoFileExists(t, oldLogPath)
	assert.FileExists(t, recentLogPath)
	assert.FileExists(t, nonLogPath)
}
