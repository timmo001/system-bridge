//go:build windows
// +build windows

package media

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// locateNowPlayingExe attempts to find the NowPlaying.exe shipped with the Windows package
// Search order:
// 1. <exe_dir>\now-playing\NowPlaying.exe (installed build)
// 2. .\now-playing\NowPlaying.exe (project root during development)
// 3. .\.scripts\windows\now-playing\NowPlaying.exe (development fallback)
func locateNowPlayingExe() (string, error) {
	// 1) Installed path beside our executable
	if exe, err := os.Executable(); err == nil {
		base := filepath.Dir(exe)
		candidate := filepath.Join(base, "now-playing", "NowPlaying.exe")
		if stat, err := os.Stat(candidate); err == nil && !stat.IsDir() {
			return candidate, nil
		}
	}

	// 2) Project root path
	if wd, err := os.Getwd(); err == nil {
		candidate := filepath.Join(wd, "now-playing", "NowPlaying.exe")
		if stat, err := os.Stat(candidate); err == nil && !stat.IsDir() {
			return candidate, nil
		}
	}

	// 3) Scripts path
	if wd, err := os.Getwd(); err == nil {
		candidate := filepath.Join(wd, ".scripts", "windows", "now-playing", "NowPlaying.exe")
		if stat, err := os.Stat(candidate); err == nil && !stat.IsDir() {
			return candidate, nil
		}
	}

	return "", errors.New("NowPlaying.exe not found")
}

func getMediaData(mediaData types.MediaData) (types.MediaData, error) {
	exePath, err := locateNowPlayingExe()
	if err != nil {
		// Fail quietly and keep defaults
		slog.Error("NowPlaying.exe not found", "error", err)
		return mediaData, nil
	}

	cmd := exec.Command(exePath)
	utils.SetHideWindow(cmd)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		slog.Error("NowPlaying.exe failed", "error", err.Error(), "stderr", strings.TrimSpace(stderr.String()))
		return mediaData, nil
	}

	output := strings.TrimSpace(stdout.String())
	if output == "" {
		return mediaData, nil
	}

	// Try to decode into expected structure first; fall back to generic map if needed
	var metadata struct {
		Title      string  `json:"Title"`
		Artist     string  `json:"Artist"`
		AlbumTitle string  `json:"AlbumTitle"`
		Status     string  `json:"Status"`
		Duration   float64 `json:"Duration"`
		Position   float64 `json:"Position"`
		PlayerName string  `json:"PlayerName"`
		Shuffle    bool    `json:"Shuffle"`
		RepeatMode string  `json:"RepeatMode"`
	}
	if err := json.Unmarshal([]byte(output), &metadata); err != nil {
		// best-effort parse: try map[string]any to avoid fatal behavior
		var generic map[string]any
		if err2 := json.Unmarshal([]byte(output), &generic); err2 != nil {
			slog.Error("NowPlaying.exe JSON parse error", "error", err.Error(), "raw_output", output)
			return mediaData, nil
		}
		// extract common fields if present
		if v, ok := generic["Title"].(string); ok {
			metadata.Title = v
		}
		if v, ok := generic["Artist"].(string); ok {
			metadata.Artist = v
		}
		if v, ok := generic["AlbumTitle"].(string); ok {
			metadata.AlbumTitle = v
		}
		if v, ok := generic["Status"].(string); ok {
			metadata.Status = v
		}
		if v, ok := generic["PlayerName"].(string); ok {
			metadata.PlayerName = v
		}
		if v, ok := generic["Shuffle"].(bool); ok {
			metadata.Shuffle = v
		}
		if v, ok := generic["RepeatMode"].(string); ok {
			metadata.RepeatMode = v
		}
		if v, ok := generic["Duration"].(float64); ok {
			metadata.Duration = v
		}
		if v, ok := generic["Position"].(float64); ok {
			metadata.Position = v
		}
	}

	mediaData.Title = &metadata.Title
	mediaData.Artist = &metadata.Artist
	mediaData.AlbumTitle = &metadata.AlbumTitle
	mediaData.Status = &metadata.Status
	mediaData.Type = &metadata.PlayerName
	mediaData.Duration = &metadata.Duration
	mediaData.Position = &metadata.Position
	mediaData.Shuffle = &metadata.Shuffle

	// Map repeat mode
	repeatStatus := "none"
	switch strings.ToLower(metadata.RepeatMode) {
	case "track", "one":
		repeatStatus = "one"
	case "list", "all":
		repeatStatus = "all"
	}
	mediaData.Repeat = &repeatStatus

	// Controls
	isPlaying := strings.EqualFold(metadata.Status, "playing")
	isPaused := strings.EqualFold(metadata.Status, "paused")
	isStopped := strings.EqualFold(metadata.Status, "stopped")

	canPlay := isPaused || isStopped
	canPause := isPlaying
	canStop := isPlaying || isPaused

	mediaData.IsPlayEnabled = &canPlay
	mediaData.IsPauseEnabled = &canPause
	mediaData.IsStopEnabled = &canStop

	// Volume is not exposed by the helper; leave as nil to keep defaults
	return mediaData, nil
}
