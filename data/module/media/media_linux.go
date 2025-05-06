//go:build linux
// +build linux

package media

import (
	"encoding/json"
	"os/exec"
	"strconv"
	"strings"
)

func getMediaData(media Media) (Media, error) {
	// On Linux, we'll use playerctl to get media information
	cmd := exec.Command("playerctl", "metadata", "--format", "json", "--all-players")
	output, err := cmd.Output()
	if err == nil {
		var metadata struct {
			Title      string  `json:"title"`
			Artist     string  `json:"artist"`
			Album      string  `json:"album"`
			Duration   string  `json:"duration"`
			Position   string  `json:"position"`
			Status     string  `json:"status"`
			PlayerName string  `json:"playerName"`
			Volume     float64 `json:"volume"`
			Shuffle    string  `json:"shuffle"`
			LoopStatus string  `json:"loopStatus"`
		}
		if err := json.Unmarshal(output, &metadata); err == nil {
			media.Title = &metadata.Title
			media.Artist = &metadata.Artist
			media.AlbumTitle = &metadata.Album
			media.Status = &metadata.Status
			media.Type = &metadata.PlayerName

			// Convert duration and position to float64
			if duration, err := strconv.ParseFloat(metadata.Duration, 64); err == nil {
				media.Duration = &duration
			}
			if position, err := strconv.ParseFloat(metadata.Position, 64); err == nil {
				media.Position = &position
			}

			// Set control states based on status
			isPlaying := strings.ToLower(metadata.Status) == "playing"
			media.IsPlayEnabled = &[]bool{!isPlaying}[0]
			media.IsPauseEnabled = &[]bool{isPlaying}[0]
			media.IsStopEnabled = &[]bool{true}[0]

			// Set shuffle and repeat states
			if metadata.Shuffle != "" {
				isShuffle := strings.ToLower(metadata.Shuffle) == "on"
				media.Shuffle = &isShuffle
			}
			if metadata.LoopStatus != "" {
				media.Repeat = &metadata.LoopStatus
			}
		}
	}

	// If playerctl fails or no media is playing, check for browser media
	if media.Title == nil {
		cmd = exec.Command("xdotool", "search", "--name", "YouTube|Netflix|Spotify|VLC", "getwindowname")
		output, err = cmd.Output()
		if err == nil {
			title := strings.TrimSpace(string(output))
			if title != "" {
				media.Title = &title
				media.Type = &[]string{"browser"}[0]
				media.Status = &[]string{"playing"}[0]
				media.IsPlayEnabled = &[]bool{true}[0]
				media.IsPauseEnabled = &[]bool{true}[0]
				media.IsStopEnabled = &[]bool{true}[0]
			}
		}
	}

	return media, nil
}
