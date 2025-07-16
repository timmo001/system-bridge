//go:build linux
// +build linux

package media

import (
	"encoding/json"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

func getMediaData(mediaData types.MediaData) (types.MediaData, error) {
	// On Linux, we'll use playerctl to get media information
	cmd := exec.Command("playerctl", "metadata", "--format", `{"title":"{{title}}","artist":"{{artist}}","album":"{{album}}","duration":"{{mpris:length}}","position":"{{position}}","status":"{{status}}","playerName":"{{playerName}}","volume":"{{volume}}","shuffle":"{{shuffle}}","loopStatus":"{{loopStatus}}"}`, "--all-players")
	output, err := cmd.Output()
	if err != nil {
		// Debug logging for playerctl errors and environment
		log.Warn("playerctl error:", "error", err.Error())
		if exitErr, ok := err.(*exec.ExitError); ok {
			log.Warn("playerctl stderr:", "stderr", string(exitErr.Stderr))
		}
		log.Warn("ENV: DBUS_SESSION_BUS_ADDRESS=", "address", os.Getenv("DBUS_SESSION_BUS_ADDRESS"))
		log.Warn("ENV: XDG_RUNTIME_DIR=", "dir", os.Getenv("XDG_RUNTIME_DIR"))
		log.Warn("ENV: DISPLAY=", "display", os.Getenv("DISPLAY"))
	} else {
		log.Info("playerctl output:", "output", string(output))
	}

	if err == nil {
		var metadata struct {
			Title       string  `json:"title"`
			Artist      string  `json:"artist"`
			Album       string  `json:"album"`
			Duration    string  `json:"duration"`
			Position    string  `json:"position"`
			Status      string  `json:"status"`
			PlayerName  string  `json:"playerName"`
			Volume      string  `json:"volume"`
			Shuffle     string  `json:"shuffle"`
			LoopStatus  string  `json:"loopStatus"`
		}
		if err := json.Unmarshal(output, &metadata); err != nil {
			log.Warn("JSON unmarshal error:", "error", err.Error(), "raw_output", string(output))
		} else {
			mediaData.Title = &metadata.Title
			mediaData.Artist = &metadata.Artist
			mediaData.AlbumTitle = &metadata.Album
			mediaData.Status = &metadata.Status
			mediaData.Type = &metadata.PlayerName

			// Convert duration and position to float64 (duration is in microseconds)
			if duration, err := strconv.ParseFloat(metadata.Duration, 64); err == nil {
				dur := duration / 1e6 // convert microseconds to seconds
				mediaData.Duration = &dur
			}
			if position, err := strconv.ParseFloat(metadata.Position, 64); err == nil {
				pos := position / 1e6 // convert microseconds to seconds
				mediaData.Position = &pos
			}

			// Parse volume string to float64 if not empty
			if metadata.Volume != "" {
				if vol, err := strconv.ParseFloat(metadata.Volume, 64); err == nil {
					mediaData.Volume = &vol
				}
			}

			// Set control states based on status
			isPlaying := strings.ToLower(metadata.Status) == "playing"
			mediaData.IsPlayEnabled = &[]bool{!isPlaying}[0]
			mediaData.IsPauseEnabled = &[]bool{isPlaying}[0]
			mediaData.IsStopEnabled = &[]bool{true}[0]

			// Set shuffle and repeat states
			if metadata.Shuffle != "" {
				isShuffle := strings.ToLower(metadata.Shuffle) == "on"
				mediaData.Shuffle = &isShuffle
			}
			if metadata.LoopStatus != "" {
				mediaData.Repeat = &metadata.LoopStatus
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
