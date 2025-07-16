//go:build linux
// +build linux

package media

import (
	"os/exec"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

func getMediaData(mediaData types.MediaData) (types.MediaData, error) {
	// On Linux, we'll use playerctl to get media information
	cmd := exec.Command("playerctl", "metadata", "--format", "{{title}}\t{{artist}}\t{{album}}\t{{mpris:length}}\t{{position}}\t{{status}}\t{{playerName}}\t{{volume}}\t{{shuffle}}\t{{loopStatus}}", "--all-players")
	output, err := cmd.Output()
	if err == nil {
		fields := strings.SplitN(strings.TrimSpace(string(output)), "\t", 10)
		if len(fields) >= 10 {
			title := fields[0]
			artist := fields[1]
			album := fields[2]
			durationStr := fields[3]
			positionStr := fields[4]
			status := fields[5]
			playerName := fields[6]
			shuffle := fields[8]
			loopStatus := fields[9]

			mediaData.Title = &title
			mediaData.Artist = &artist
			mediaData.AlbumTitle = &album
			mediaData.Status = &status
			mediaData.Type = &playerName

			// Convert duration and position to float64 (duration is in microseconds)
			if duration, err := strconv.ParseFloat(durationStr, 64); err == nil {
				dur := duration / 1e6 // convert microseconds to seconds
				mediaData.Duration = &dur
			}
			if position, err := strconv.ParseFloat(positionStr, 64); err == nil {
				pos := position / 1e6 // convert microseconds to seconds
				mediaData.Position = &pos
			}

			// Set control states based on status
			isPlaying := strings.ToLower(status) == "playing"
			mediaData.IsPlayEnabled = &[]bool{!isPlaying}[0]
			mediaData.IsPauseEnabled = &[]bool{isPlaying}[0]
			mediaData.IsStopEnabled = &[]bool{true}[0]

			// Set shuffle and repeat states
			if shuffle != "" {
				isShuffle := strings.ToLower(shuffle) == "on"
				mediaData.Shuffle = &isShuffle
			}
			if loopStatus != "" {
				mediaData.Repeat = &loopStatus
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
