package media

import (
	"time"
)

// MediaData represents media information
type Media struct {
	AlbumArtist          *string  `json:"album_artist"`
	AlbumTitle           *string  `json:"album_title"`
	Artist               *string  `json:"artist"`
	Duration             *float64 `json:"duration"`
	IsFastForwardEnabled *bool    `json:"is_fast_forward_enabled"`
	IsNextEnabled        *bool    `json:"is_next_enabled"`
	IsPauseEnabled       *bool    `json:"is_pause_enabled"`
	IsPlayEnabled        *bool    `json:"is_play_enabled"`
	IsPreviousEnabled    *bool    `json:"is_previous_enabled"`
	IsRewindEnabled      *bool    `json:"is_rewind_enabled"`
	IsStopEnabled        *bool    `json:"is_stop_enabled"`
	PlaybackRate         *float64 `json:"playback_rate"`
	Position             *float64 `json:"position"`
	Repeat               *string  `json:"repeat"`
	Shuffle              *bool    `json:"shuffle"`
	Status               *string  `json:"status"`
	Subtitle             *string  `json:"subtitle"`
	Thumbnail            *string  `json:"thumbnail"`
	Title                *string  `json:"title"`
	TrackNumber          *int     `json:"track_number"`
	Type                 *string  `json:"type"`
	UpdatedAt            int64    `json:"updated_at"`
	Volume               *float64 `json:"volume"`
}

// GetMediaData gets media information from the system
func GetMediaData() (Media, error) {

	// Initialize media data with default values
	mediaData := Media{
		UpdatedAt: time.Now().Unix(),
	}

	// Get platform-specific media data
	return getMediaData(mediaData)
}
