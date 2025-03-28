//go:build linux
// +build linux

package media

import (
	"encoding/json"
	"os/exec"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

func getMediaData(mediaData types.MediaData) (types.MediaData, error) {
	// On Linux, we'll use playerctl to get media information
	cmd := exec.Command("playerctl", "metadata", "--format", "json", "--all-players")
	output, err := cmd.Output()
	if err == nil {
		var metadata struct {
			Title       string  `json:"title"`
			Artist      string  `json:"artist"`
			Album       string  `json:"album"`
			Duration    string  `json:"duration"`
			Position    string  `json:"position"`
			Status      string  `json:"status"`
			PlayerName  string  `json:"playerName"`
			Volume      float64 `json:"volume"`
			Shuffle     string  `json:"shuffle"`
			LoopStatus  string  `json:"loopStatus"`
		}
		if err := json.Unmarshal(output, &metadata); err == nil {
			mediaData.Title = &metadata.Title
			mediaData.Artist = &metadata.Artist
			mediaData.AlbumTitle = &metadata.Album
			mediaData.Status = &metadata.Status
			mediaData.Type = &metadata.PlayerName

			// Convert duration and position to float64
			if duration, err := strconv.ParseFloat(metadata.Duration, 64); err == nil {
				mediaData.Duration = &duration
			}
			if position, err := strconv.ParseFloat(metadata.Position, 64); err == nil {
				mediaData.Position = &position
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
