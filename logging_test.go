package main

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/utils"
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

func TestMigrateLegacyLogFile(t *testing.T) {
	t.Run("moves legacy log into dated log file", func(t *testing.T) {
		baseDir := t.TempDir()
		configDir := filepath.Join(baseDir, "config")
		logsDir := filepath.Join(baseDir, "logs")

		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", configDir)
		t.Setenv("SYSTEM_BRIDGE_LOG_DIR", logsDir)

		legacyLogPath := filepath.Join(configDir, "system-bridge.log")
		require.NoError(t, os.MkdirAll(configDir, 0755))
		require.NoError(t, os.WriteFile(legacyLogPath, []byte("legacy entry\n"), logFilePermissions))

		modTime := time.Date(2026, time.March, 6, 12, 0, 0, 0, time.UTC)
		require.NoError(t, os.Chtimes(legacyLogPath, modTime, modTime))

		require.NoError(t, migrateLegacyLogFile())

		targetLogPath, err := utils.GetLogFilePath(modTime)
		require.NoError(t, err)

		assert.NoFileExists(t, legacyLogPath)
		assert.FileExists(t, targetLogPath)

		content, err := os.ReadFile(targetLogPath)
		require.NoError(t, err)
		assert.Equal(t, "legacy entry\n", string(content))

		if runtime.GOOS != "windows" {
			info, err := os.Stat(targetLogPath)
			require.NoError(t, err)
			assert.Equal(t, logFilePermissions, info.Mode().Perm())

			logsInfo, err := os.Stat(logsDir)
			require.NoError(t, err)
			assert.Equal(t, os.FileMode(0700), logsInfo.Mode().Perm())
		}
	})

	t.Run("appends legacy log into existing dated log file", func(t *testing.T) {
		baseDir := t.TempDir()
		configDir := filepath.Join(baseDir, "config")
		logsDir := filepath.Join(baseDir, "logs")

		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", configDir)
		t.Setenv("SYSTEM_BRIDGE_LOG_DIR", logsDir)

		legacyLogPath := filepath.Join(configDir, "system-bridge.log")
		require.NoError(t, os.MkdirAll(configDir, 0755))
		require.NoError(t, os.WriteFile(legacyLogPath, []byte("legacy entry\n"), logFilePermissions))

		modTime := time.Date(2026, time.March, 8, 12, 0, 0, 0, time.UTC)
		require.NoError(t, os.Chtimes(legacyLogPath, modTime, modTime))

		targetLogPath, err := utils.GetLogFilePath(modTime)
		require.NoError(t, err)
		require.NoError(t, os.WriteFile(targetLogPath, []byte("existing entry\n"), logFilePermissions))

		require.NoError(t, migrateLegacyLogFile())

		assert.NoFileExists(t, legacyLogPath)

		content, err := os.ReadFile(targetLogPath)
		require.NoError(t, err)
		assert.Equal(t, "existing entry\nlegacy entry\n", string(content))

		if runtime.GOOS != "windows" {
			info, err := os.Stat(targetLogPath)
			require.NoError(t, err)
			assert.Equal(t, logFilePermissions, info.Mode().Perm())
		}
	})
}

func TestOpenLogFilePermissions(t *testing.T) {
	baseDir := t.TempDir()
	logsDir := filepath.Join(baseDir, "logs")

	t.Setenv("SYSTEM_BRIDGE_LOG_DIR", logsDir)

	logFile, err := openLogFile(time.Date(2026, time.March, 8, 12, 0, 0, 0, time.UTC))
	require.NoError(t, err)
	require.NoError(t, logFile.Close())

	logPath := filepath.Join(logsDir, "2026-03-08.log")
	assert.FileExists(t, logPath)

	if runtime.GOOS == "windows" {
		return
	}

	info, err := os.Stat(logPath)
	require.NoError(t, err)
	assert.Equal(t, logFilePermissions, info.Mode().Perm())

	dirInfo, err := os.Stat(logsDir)
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0700), dirInfo.Mode().Perm())
}
