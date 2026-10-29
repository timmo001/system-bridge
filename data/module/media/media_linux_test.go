//go:build linux

package media

import (
	"testing"

	"github.com/godbus/dbus/v5"
	"github.com/timmo001/system-bridge/types"
)

func TestDescribePlayer(t *testing.T) {
	player := mprisPlayer{
		instance: "spotify.instance1",
		properties: map[string]dbus.Variant{
			"PlaybackStatus": dbus.MakeVariant("Paused"),
			"CanControl":     dbus.MakeVariant(true),
			"CanPlay":        dbus.MakeVariant(true),
			"CanPause":       dbus.MakeVariant(true),
			"CanSeek":        dbus.MakeVariant(true),
			"CanGoNext":      dbus.MakeVariant(false),
			"Position":       dbus.MakeVariant(int64(30_000_000)),
			"Volume":         dbus.MakeVariant(0.5),
			"LoopStatus":     dbus.MakeVariant("Playlist"),
		},
		metadata: map[string]dbus.Variant{
			"mpris:trackid":     dbus.MakeVariant(dbus.ObjectPath("/track/1")),
			"mpris:length":      dbus.MakeVariant(int64(180_000_000)),
			"mpris:artUrl":      dbus.MakeVariant("https://example.com/art.jpg"),
			"xesam:title":       dbus.MakeVariant("Song"),
			"xesam:artist":      dbus.MakeVariant([]string{"A", "B"}),
			"xesam:album":       dbus.MakeVariant("Album"),
			"xesam:trackNumber": dbus.MakeVariant(int32(3)),
		},
	}

	described := describePlayer(player)

	if described.ID != "spotify.instance1" || described.Name != "spotify" || described.Status != "PAUSED" {
		t.Fatalf("unexpected identity: %+v", described)
	}
	if described.Title != "Song" || described.Artist != "A, B" || *described.AlbumTitle != "Album" {
		t.Errorf("unexpected track: %+v", described)
	}
	if described.AlbumArtist != nil {
		t.Errorf("album artist = %q, want nil", *described.AlbumArtist)
	}
	if *described.TrackNumber != 3 || *described.Duration != 180 || *described.Position != 30 {
		t.Errorf("unexpected track number, duration or position: %+v", described)
	}
	if *described.Volume != 0.5 || *described.Repeat != "LIST" || described.Shuffle != nil {
		t.Errorf("unexpected volume, repeat or shuffle: %+v", described)
	}
	if *described.Thumbnail != "https://example.com/art.jpg" {
		t.Errorf("thumbnail = %q", *described.Thumbnail)
	}
	if !*described.IsPlayEnabled || *described.IsPauseEnabled || !*described.IsSeekEnabled || *described.IsNextEnabled {
		t.Errorf("unexpected capabilities: %+v", described)
	}
}

func TestDescribeTopLevel(t *testing.T) {
	duration := 180.0
	player := types.MediaPlayer{
		ID:       "vlc",
		Name:     "vlc",
		Status:   "PLAYING",
		Title:    "Song",
		Duration: &duration,
	}
	mediaData := types.MediaData{}

	describeTopLevel(&mediaData, player)

	if *mediaData.Player != "vlc" || *mediaData.Type != "vlc" || *mediaData.Status != "PLAYING" || *mediaData.Title != "Song" {
		t.Errorf("unexpected top level: %+v", mediaData)
	}
	if mediaData.Duration != &duration {
		t.Errorf("duration isn't the player's")
	}
}
