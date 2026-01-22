//go:build linux

package media

import (
	"encoding/json"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

func getMediaData(mediaData types.MediaData) (types.MediaData, error) {
	// On Linux, we'll use playerctl to get media information
	cmd := exec.Command("playerctl", "metadata", "--format", `{"title":"{{title}}","artist":"{{artist}}","album":"{{album}}","duration":"{{mpris:length}}","position":"{{position}}","status":"{{status}}","playerName":"{{playerName}}","volume":"{{volume}}","shuffle":"{{shuffle}}","loopStatus":"{{loopStatus}}"}`, "--all-players")
	output, err := cmd.Output()
	if err != nil {
		// Info logging for playerctl errors (expected when no media player running)
		slog.Info("playerctl unavailable or no players", "error", err.Error())
		if exitErr, ok := err.(*exec.ExitError); ok {
			slog.Debug("playerctl stderr:", "stderr", string(exitErr.Stderr))
		}
		slog.Debug("ENV: DBUS_SESSION_BUS_ADDRESS=", "address", os.Getenv("DBUS_SESSION_BUS_ADDRESS"))
		slog.Debug("ENV: XDG_RUNTIME_DIR=", "dir", os.Getenv("XDG_RUNTIME_DIR"))
		slog.Debug("ENV: DISPLAY=", "display", os.Getenv("DISPLAY"))
	} else {
		slog.Debug("playerctl output:", "output", string(output))
	}

	if err == nil {
		// playerctl --all-players may emit multiple JSON objects separated by newlines.
		// Parse one or many lines and select the most relevant (prefer Playing, then Paused, else first).
		type playerMetadata struct {
			Title      string `json:"title"`
			Artist     string `json:"artist"`
			Album      string `json:"album"`
			Duration   string `json:"duration"`
			Position   string `json:"position"`
			Status     string `json:"status"`
			PlayerName string `json:"playerName"`
			Volume     string `json:"volume"`
			Shuffle    string `json:"shuffle"`
			LoopStatus string `json:"loopStatus"`
		}

		parseSingle := func(b []byte) (*playerMetadata, error) {
			var m playerMetadata
			if err := json.Unmarshal(b, &m); err != nil {
				return nil, err
			}
			return &m, nil
		}

		// Try single JSON first
		chosen, singleErr := parseSingle(output)
		if singleErr != nil {
			// Fall back to multi-line parsing
			lines := strings.Split(strings.TrimSpace(string(output)), "\n")
			var candidates []playerMetadata
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" {
					continue
				}
				if m, err := parseSingle([]byte(line)); err == nil {
					candidates = append(candidates, *m)
				}
			}

			if len(candidates) == 0 {
				// Keep previous warning behavior with raw output to aid debugging
				slog.Warn("JSON unmarshal error:", "error", singleErr.Error(), "raw_output", string(output))
				return mediaData, nil
			}

			// Select preferred candidate
			var selected *playerMetadata
			// Prefer Playing
			for i := range candidates {
				if strings.EqualFold(candidates[i].Status, "playing") {
					selected = &candidates[i]
					break
				}
			}
			// Then Paused
			if selected == nil {
				for i := range candidates {
					if strings.EqualFold(candidates[i].Status, "paused") {
						selected = &candidates[i]
						break
					}
				}
			}
			// Else first
			if selected == nil {
				selected = &candidates[0]
			}
			chosen = selected
		}

		// Apply chosen metadata to mediaData
		if chosen != nil {
			mediaData.Title = &chosen.Title
			mediaData.Artist = &chosen.Artist
			mediaData.AlbumTitle = &chosen.Album

			// Normalize status to HA-expected constants
			if chosen.Status != "" {
				s := strings.ToUpper(chosen.Status)
				switch s {
				case "PLAYING", "PAUSED", "STOPPED", "CHANGING":
					// ok
				default:
					// best-effort mapping
					if strings.EqualFold(chosen.Status, "play") || strings.EqualFold(chosen.Status, "playing") {
						s = "PLAYING"
					} else if strings.EqualFold(chosen.Status, "pause") || strings.EqualFold(chosen.Status, "paused") {
						s = "PAUSED"
					} else if strings.EqualFold(chosen.Status, "stop") || strings.EqualFold(chosen.Status, "stopped") {
						s = "STOPPED"
					} else {
						s = "STOPPED"
					}
				}
				mediaData.Status = &s
			}
			mediaData.Type = &chosen.PlayerName

			// Convert duration and position to float64 (duration is in microseconds)
			if duration, err := strconv.ParseFloat(chosen.Duration, 64); err == nil {
				dur := duration / 1e6 // convert microseconds to seconds
				mediaData.Duration = &dur
			}
			if position, err := strconv.ParseFloat(chosen.Position, 64); err == nil {
				pos := position / 1e6 // convert microseconds to seconds
				mediaData.Position = &pos
			}

			// Parse volume string to float64 if not empty
			if chosen.Volume != "" {
				if vol, err := strconv.ParseFloat(chosen.Volume, 64); err == nil {
					mediaData.Volume = &vol
				}
			}

			// Set control states based on status
			isPlaying := strings.ToLower(chosen.Status) == "playing"
			mediaData.IsPlayEnabled = &[]bool{!isPlaying}[0]
			mediaData.IsPauseEnabled = &[]bool{isPlaying}[0]
			mediaData.IsStopEnabled = &[]bool{true}[0]

			// Set shuffle and repeat states
			if chosen.Shuffle != "" {
				isShuffle := strings.ToLower(chosen.Shuffle) == "on"
				mediaData.Shuffle = &isShuffle
			}
			if chosen.LoopStatus != "" {
				// Normalize repeat to HA-expected constants: NONE/TRACK/LIST
				ls := strings.ToUpper(chosen.LoopStatus)
				switch ls {
				case "NONE":
					// ok
				case "TRACK", "ONE":
					ls = "TRACK"
				case "LIST", "ALL", "PLAYLIST", "ALBUM":
					ls = "LIST"
				default:
					ls = "NONE"
				}
				mediaData.Repeat = &ls
			}
		}
	}

	// If playerctl fails or no media is playing, check for browser media
	if mediaData.Title == nil {
		cmd = exec.Command("xdotool", "search", "--name", "YouTube|Netflix|Spotify|VLC", "getwindowname")
		output, err = cmd.Output()
		if err == nil {
			title := strings.TrimSpace(string(output))
			if title != "" {
				mediaData.Title = &title
				mediaData.Type = &[]string{"browser"}[0]
				mediaData.Status = &[]string{"playing"}[0]
				mediaData.IsPlayEnabled = &[]bool{true}[0]
				mediaData.IsPauseEnabled = &[]bool{true}[0]
				mediaData.IsStopEnabled = &[]bool{true}[0]
			}
		}
	}

	return mediaData, nil
}
