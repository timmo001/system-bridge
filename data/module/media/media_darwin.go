//go:build darwin
// +build darwin

package media

import (
	"encoding/json"
	"os/exec"
	"strings"
)

func getMediaData(media Media) (Media, error) {
	// On macOS, we'll use osascript to get media information
	cmd := exec.Command("osascript", "-e", `
		tell application "System Events"
			set mediaInfo to {}

			# Check Music app
			if exists process "Music" then
				tell process "Music"
					if exists window 1 then
						set currentTrack to name of window 1
						if currentTrack does not start with "Music" then
							set mediaInfo to {title:currentTrack, status:"playing", type:"music"}
						end if
					end if
				end tell
			end if

			# Check Spotify
			if exists process "Spotify" then
				tell process "Spotify"
					if exists window 1 then
						set currentTrack to name of window 1
						if currentTrack does not start with "Spotify" then
							set mediaInfo to {title:currentTrack, status:"playing", type:"spotify"}
						end if
					end if
				end tell
			end if

			# Check VLC
			if exists process "VLC" then
				tell process "VLC"
					if exists window 1 then
						set currentTrack to name of window 1
						if currentTrack does not start with "VLC" then
							set mediaInfo to {title:currentTrack, status:"playing", type:"vlc"}
						end if
					end if
				end tell
			end if

			return mediaInfo
		end tell
	`)
	output, err := cmd.Output()
	if err == nil {
		var mediaInfo struct {
			Title  string `json:"title"`
			Status string `json:"status"`
			Type   string `json:"type"`
		}
		if err := json.Unmarshal(output, &mediaInfo); err == nil && mediaInfo.Title != "" {
			media.Title = &mediaInfo.Title
			media.Status = &mediaInfo.Status
			media.Type = &mediaInfo.Type

			// Set control states based on status
			isPlaying := strings.ToLower(mediaInfo.Status) == "playing"
			media.IsPlayEnabled = &[]bool{!isPlaying}[0]
			media.IsPauseEnabled = &[]bool{isPlaying}[0]
			media.IsStopEnabled = &[]bool{true}[0]

			// Get additional metadata based on media type
			switch mediaInfo.Type {
			case "music":
				// Get Music app metadata
				cmd = exec.Command("osascript", "-e", `
					tell application "Music"
						if player state is playing then
							return {artist:artist of current track, album:album of current track, duration:duration of current track, position:player position}
						end if
					end tell
				`)
				if output, err = cmd.Output(); err == nil {
					var metadata struct {
						Artist   string  `json:"artist"`
						Album    string  `json:"album"`
						Duration float64 `json:"duration"`
						Position float64 `json:"position"`
					}
					if err := json.Unmarshal(output, &metadata); err == nil {
						media.Artist = &metadata.Artist
						media.AlbumTitle = &metadata.Album
						media.Duration = &metadata.Duration
						media.Position = &metadata.Position
					}
				}
			case "spotify":
				// Get Spotify metadata
				cmd = exec.Command("osascript", "-e", `
					tell application "Spotify"
						if player state is playing then
							return {artist:artist of current track, album:album of current track, duration:duration of current track, position:player position}
						end if
					end tell
				`)
				if output, err = cmd.Output(); err == nil {
					var metadata struct {
						Artist   string  `json:"artist"`
						Album    string  `json:"album"`
						Duration float64 `json:"duration"`
						Position float64 `json:"position"`
					}
					if err := json.Unmarshal(output, &metadata); err == nil {
						media.Artist = &metadata.Artist
						media.AlbumTitle = &metadata.Album
						media.Duration = &metadata.Duration
						media.Position = &metadata.Position
					}
				}
			}
		}
	}

	return media, nil
}
