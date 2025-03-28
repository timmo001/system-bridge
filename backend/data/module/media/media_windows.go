//go:build windows
// +build windows

package media

import (
	"encoding/json"
	"os/exec"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

func getMediaData(mediaData types.MediaData) (types.MediaData, error) {
	// On Windows, we'll use PowerShell to get media information from various sources
	cmd := exec.Command("powershell", "-Command", `
		$mediaInfo = @()

		# Check Windows Media Player
		try {
			$wmp = New-Object -ComObject WMPLib.WindowsMediaPlayer
			if ($wmp.PlayState -eq 1) { # 1 = Playing
				$mediaInfo += @{
					Title = $wmp.currentMedia.name
					Artist = $wmp.currentMedia.getItemInfo("Author")
					Album = $wmp.currentMedia.getItemInfo("Album")
					Duration = $wmp.currentMedia.duration
					Position = $wmp.controls.currentPosition
					Status = "playing"
					Type = "windows_media_player"
					Volume = $wmp.settings.volume
					Shuffle = $wmp.settings.shuffle
					Repeat = $wmp.settings.repeat
				}
			}
		} catch {
			# Silently continue if WMP is not available
		}

		# Check Spotify
		$spotify = Get-Process "Spotify" -ErrorAction SilentlyContinue
		if ($spotify) {
			$spotifyWindow = Get-Process "Spotify" | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object -First 1
			if ($spotifyWindow) {
				$title = $spotifyWindow.MainWindowTitle
				if ($title -ne "Spotify") {
					$mediaInfo += @{
						Title = $title
						Status = "playing"
						Type = "spotify"
					}
				}
			}
		}

		# Check VLC
		$vlc = Get-Process "vlc" -ErrorAction SilentlyContinue
		if ($vlc) {
			$vlcWindow = Get-Process "vlc" | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object -First 1
			if ($vlcWindow) {
				$title = $vlcWindow.MainWindowTitle
				if ($title -ne "VLC media player") {
					$mediaInfo += @{
						Title = $title
						Status = "playing"
						Type = "vlc"
					}
				}
			}
		}

		# Check Windows Media Foundation (for modern apps)
		try {
			$shell = New-Object -ComObject Shell.Application
			$shell.Windows() | ForEach-Object {
				if ($_.Document.Title -and $_.Document.Title -ne "New Tab") {
					$title = $_.Document.Title
					if ($title -match "YouTube|Netflix|Spotify|VLC|Plex|Amazon Prime Video|Disney\+") {
						$mediaInfo += @{
							Title = $title
							Type = "browser"
							Status = "playing"
						}
					}
				}
			}
		} catch {
			# Silently continue if browser media detection fails
		}

		# Check for other media players
		$mediaPlayers = @(
			"iTunes",
			"foobar2000",
			"Winamp",
			"MediaMonkey",
			"MusicBee"
		)

		foreach ($player in $mediaPlayers) {
			$process = Get-Process $player -ErrorAction SilentlyContinue
			if ($process) {
				$window = $process | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object -First 1
				if ($window) {
					$title = $window.MainWindowTitle
					if ($title -ne $player) {
						$mediaInfo += @{
							Title = $title
							Status = "playing"
							Type = $player.ToLower()
						}
					}
				}
			}
		}

		$mediaInfo | ConvertTo-Json
	`)

	output, err := cmd.Output()
	if err == nil {
		var mediaInfo []struct {
			Title     string  `json:"Title"`
			Artist    string  `json:"Artist"`
			Album     string  `json:"Album"`
			Duration  float64 `json:"Duration"`
			Position  float64 `json:"Position"`
			Status    string  `json:"Status"`
			Type      string  `json:"Type"`
			Volume    float64 `json:"Volume"`
			Shuffle   bool    `json:"Shuffle"`
			Repeat    string  `json:"Repeat"`
		}
		if err := json.Unmarshal(output, &mediaInfo); err == nil && len(mediaInfo) > 0 {
			// Use the first media source found
			info := mediaInfo[0]
			mediaData.Title = &info.Title
			mediaData.Artist = &info.Artist
			mediaData.AlbumTitle = &info.Album
			mediaData.Status = &info.Status
			mediaData.Type = &info.Type

			// Set duration and position if available
			if info.Duration > 0 {
				mediaData.Duration = &info.Duration
			}
			if info.Position > 0 {
				mediaData.Position = &info.Position
			}

			// Set control states based on status
			isPlaying := strings.ToLower(info.Status) == "playing"
			mediaData.IsPlayEnabled = &[]bool{!isPlaying}[0]
			mediaData.IsPauseEnabled = &[]bool{isPlaying}[0]
			mediaData.IsStopEnabled = &[]bool{true}[0]

			// Set additional metadata if available
			if info.Volume > 0 {
				mediaData.Volume = &info.Volume
			}
			mediaData.Shuffle = &info.Shuffle
			if info.Repeat != "" {
				mediaData.Repeat = &info.Repeat
			}
		}
	}

	return mediaData, nil
}
