package data_module

import "github.com/charmbracelet/log"

// Media represents media information
type MediaData struct {
	AlbumArtist          *string  `json:"album_artist,omitempty"`
	AlbumTitle           *string  `json:"album_title,omitempty"`
	Artist               *string  `json:"artist,omitempty"`
	Duration             *float64 `json:"duration,omitempty"`
	IsFastForwardEnabled *bool    `json:"is_fast_forward_enabled,omitempty"`
	IsNextEnabled        *bool    `json:"is_next_enabled,omitempty"`
	IsPauseEnabled       *bool    `json:"is_pause_enabled,omitempty"`
	IsPlayEnabled        *bool    `json:"is_play_enabled,omitempty"`
	IsPreviousEnabled    *bool    `json:"is_previous_enabled,omitempty"`
	IsRewindEnabled      *bool    `json:"is_rewind_enabled,omitempty"`
	IsStopEnabled        *bool    `json:"is_stop_enabled,omitempty"`
	PlaybackRate         *float64 `json:"playback_rate,omitempty"`
	Position             *float64 `json:"position,omitempty"`
	Repeat               *string  `json:"repeat,omitempty"`
	Shuffle              *bool    `json:"shuffle,omitempty"`
	Status               *string  `json:"status,omitempty"`
	Subtitle             *string  `json:"subtitle,omitempty"`
	Thumbnail            *string  `json:"thumbnail,omitempty"`
	Title                *string  `json:"title,omitempty"`
	TrackNumber          *int     `json:"track_number,omitempty"`
	Type                 *string  `json:"type,omitempty"`
	UpdatedAt            *float64 `json:"updated_at,omitempty"`
}

func (t *Module) UpdateMediaModule() (MediaData, error) {
	log.Info("Getting media data")

	// TODO: Implement
	return MediaData{}, nil
}
