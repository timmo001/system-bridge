//go:build linux

package media

import (
	"context"

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
	picked := pickPlayer(players)
	for _, player := range players {
		described := describePlayer(player)
		mediaData.Players = append(mediaData.Players, described)
		if picked != nil && player.instance == picked.instance {
			describeTopLevel(&mediaData, described)
		}
	}
	return mediaData, nil
}

// describeTopLevel fills the media data's own fields from the picked player,
// as clients that don't read players expect
func describeTopLevel(mediaData *types.MediaData, player types.MediaPlayer) {
	mediaData.Player = &player.ID
	mediaData.Title = &player.Title
	mediaData.Artist = &player.Artist
	mediaData.AlbumTitle = player.AlbumTitle
	mediaData.AlbumArtist = player.AlbumArtist
	mediaData.Type = &player.Name
	mediaData.TrackNumber = player.TrackNumber
	mediaData.Thumbnail = player.Thumbnail
	mediaData.Status = &player.Status
	mediaData.Duration = player.Duration
	mediaData.Position = player.Position
	mediaData.Volume = player.Volume
	mediaData.PlaybackRate = player.PlaybackRate
	mediaData.Shuffle = player.Shuffle
	mediaData.Repeat = player.Repeat
	mediaData.IsSeekEnabled = player.IsSeekEnabled
	mediaData.IsPlayEnabled = player.IsPlayEnabled
	mediaData.IsPauseEnabled = player.IsPauseEnabled
	mediaData.IsStopEnabled = player.IsStopEnabled
	mediaData.IsNextEnabled = player.IsNextEnabled
	mediaData.IsPreviousEnabled = player.IsPreviousEnabled
}

// describePlayer is what clients get about one MPRIS player
func describePlayer(player mprisPlayer) types.MediaPlayer {
	album := player.text("xesam:album")
	described := types.MediaPlayer{
		ID:         player.instance,
		Name:       player.name(),
		Status:     player.state(),
		Title:      player.title(),
		Artist:     player.text("xesam:artist"),
		AlbumTitle: &album,
	}
	if albumArtist := player.text("xesam:albumArtist"); albumArtist != "" {
		described.AlbumArtist = &albumArtist
	}
	if trackNumber, ok := player.metadata["xesam:trackNumber"].Value().(int32); ok {
		number := int(trackNumber)
		described.TrackNumber = &number
	}

	// A file URL points at this machine's disk, which clients can't load, so
	// resolveArtURL turns it into a data URL
	if artURL := resolveArtURL(player.text("mpris:artUrl")); artURL != "" {
		described.Thumbnail = &artURL
	}

	if duration, ok := microseconds(player.metadata["mpris:length"]); ok {
		described.Duration = &duration
	}
	if position, ok := microseconds(player.properties["Position"]); ok {
		described.Position = &position
	}
	if volume, ok := player.properties["Volume"].Value().(float64); ok {
		described.Volume = &volume
	}
	if rate, ok := player.properties["Rate"].Value().(float64); ok {
		described.PlaybackRate = &rate
	}
	if shuffle, ok := player.properties["Shuffle"].Value().(bool); ok {
		described.Shuffle = &shuffle
	}
	if loopStatus, ok := player.properties["LoopStatus"].Value().(string); ok {
		if repeat, known := loopStatuses[loopStatus]; known {
			described.Repeat = &repeat
		}
	}

	isPlaying := described.Status == "PLAYING"
	canPlay := player.can("CanPlay") && !isPlaying
	canPause := player.can("CanPause") && isPlaying
	canStop := player.flag("CanControl")
	canNext := player.can("CanGoNext")
	canPrevious := player.can("CanGoPrevious")
	_, hasTrack := player.trackID()
	canSeek := player.can("CanSeek") && hasTrack && described.Duration != nil
	described.IsSeekEnabled = &canSeek
	described.IsPlayEnabled = &canPlay
	described.IsPauseEnabled = &canPause
	described.IsStopEnabled = &canStop
	described.IsNextEnabled = &canNext
	described.IsPreviousEnabled = &canPrevious

	return described
}
