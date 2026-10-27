//go:build linux

package media

import (
	"context"
	"strings"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

// loopStatuses maps MPRIS's LoopStatus to the repeat values clients expect
var loopStatuses = map[string]string{
	"None":     "NONE",
	"Track":    "TRACK",
	"Playlist": "LIST",
}

func getMediaData(ctx context.Context, mediaData types.MediaData) (types.MediaData, error) {
	players, err := listPlayers(ctx)
	if err != nil {
		slog.Info("Failed to list media players", "error", err)
		return mediaData, nil
	}
	for _, player := range players {
		mediaData.Players = append(mediaData.Players, types.MediaPlayer{
			ID:     player.instance,
			Name:   player.name(),
			Status: player.state(),
			Title:  player.title(),
			Artist: player.text("xesam:artist"),
		})
	}
	player := pickPlayer(players)
	if player == nil {
		return mediaData, nil
	}
	mediaData.Player = &player.instance

	title := player.title()
	artist := player.text("xesam:artist")
	album := player.text("xesam:album")
	name := player.name()
	mediaData.Title = &title
	mediaData.Artist = &artist
	mediaData.AlbumTitle = &album
	mediaData.Type = &name
	if albumArtist := player.text("xesam:albumArtist"); albumArtist != "" {
		mediaData.AlbumArtist = &albumArtist
	}
	if trackNumber, ok := player.metadata["xesam:trackNumber"].Value().(int32); ok {
		number := int(trackNumber)
		mediaData.TrackNumber = &number
	}

	// Only art a client can load itself: a web or data URL. A file URL points
	// at this machine's disk
	if artURL := player.text("mpris:artUrl"); strings.HasPrefix(artURL, "https://") ||
		strings.HasPrefix(artURL, "http://") ||
		strings.HasPrefix(artURL, "data:image/") {
		mediaData.Thumbnail = &artURL
	}

	status := player.state()
	mediaData.Status = &status

	if duration, ok := microseconds(player.metadata["mpris:length"]); ok {
		mediaData.Duration = &duration
	}
	if position, ok := microseconds(player.properties["Position"]); ok {
		mediaData.Position = &position
	}
	if volume, ok := player.properties["Volume"].Value().(float64); ok {
		mediaData.Volume = &volume
	}
	if rate, ok := player.properties["Rate"].Value().(float64); ok {
		mediaData.PlaybackRate = &rate
	}
	if shuffle, ok := player.properties["Shuffle"].Value().(bool); ok {
		mediaData.Shuffle = &shuffle
	}
	if loopStatus, ok := player.properties["LoopStatus"].Value().(string); ok {
		if repeat, known := loopStatuses[loopStatus]; known {
			mediaData.Repeat = &repeat
		}
	}

	isPlaying := status == "PLAYING"
	canPlay := player.can("CanPlay") && !isPlaying
	canPause := player.can("CanPause") && isPlaying
	canStop := player.flag("CanControl")
	canNext := player.can("CanGoNext")
	canPrevious := player.can("CanGoPrevious")
	_, hasTrack := player.trackID()
	canSeek := player.can("CanSeek") && hasTrack && mediaData.Duration != nil
	mediaData.IsSeekEnabled = &canSeek
	mediaData.IsPlayEnabled = &canPlay
	mediaData.IsPauseEnabled = &canPause
	mediaData.IsStopEnabled = &canStop
	mediaData.IsNextEnabled = &canNext
	mediaData.IsPreviousEnabled = &canPrevious

	return mediaData, nil
}
