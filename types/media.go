package types

// MediaPlayer is a media player System Bridge can see, with the same details
// MediaData gives for the player it describes, so a client can show any of
// them
type MediaPlayer struct {
	ID                string   `json:"id"` // Pass as player in MEDIA_CONTROL to control this one
	Name              string   `json:"name"`
	Status            string   `json:"status"` // PLAYING, PAUSED or STOPPED
	Title             string   `json:"title"`
	Artist            string   `json:"artist"`
	AlbumArtist       *string  `json:"album_artist"`
	AlbumTitle        *string  `json:"album_title"`
	Duration          *float64 `json:"duration"`
	IsNextEnabled     *bool    `json:"is_next_enabled"`
	IsPauseEnabled    *bool    `json:"is_pause_enabled"`
	IsPlayEnabled     *bool    `json:"is_play_enabled"`
	IsPreviousEnabled *bool    `json:"is_previous_enabled"`
	IsSeekEnabled     *bool    `json:"is_seek_enabled"`
	IsStopEnabled     *bool    `json:"is_stop_enabled"`
	PlaybackRate      *float64 `json:"playback_rate"`
	Position          *float64 `json:"position"`
	Repeat            *string  `json:"repeat"`
	Shuffle           *bool    `json:"shuffle"`
	Thumbnail         *string  `json:"thumbnail"`
	TrackNumber       *int     `json:"track_number"`
	Volume            *float64 `json:"volume"`
}

// MediaData represents media information. The fields describe one player,
// the one in Player, picked from Players: the first playing, else the first
// paused.
type MediaData struct {
	AlbumArtist          *string       `json:"album_artist"`
	AlbumTitle           *string       `json:"album_title"`
	Artist               *string       `json:"artist"`
	Duration             *float64      `json:"duration"`
	IsFastForwardEnabled *bool         `json:"is_fast_forward_enabled"`
	IsNextEnabled        *bool         `json:"is_next_enabled"`
	IsPauseEnabled       *bool         `json:"is_pause_enabled"`
	IsPlayEnabled        *bool         `json:"is_play_enabled"`
	IsPreviousEnabled    *bool         `json:"is_previous_enabled"`
	IsRewindEnabled      *bool         `json:"is_rewind_enabled"`
	IsSeekEnabled        *bool         `json:"is_seek_enabled"`
	IsStopEnabled        *bool         `json:"is_stop_enabled"`
	PlaybackRate         *float64      `json:"playback_rate"`
	Player               *string       `json:"player"`  // The ID of the player described
	Players              []MediaPlayer `json:"players"` // Every player, empty where they can't be listed
	Position             *float64      `json:"position"`
	Repeat               *string       `json:"repeat"`
	Shuffle              *bool         `json:"shuffle"`
	Status               *string       `json:"status"`
	Subtitle             *string       `json:"subtitle"`
	Thumbnail            *string       `json:"thumbnail"`
	Title                *string       `json:"title"`
	TrackNumber          *int          `json:"track_number"`
	Type                 *string       `json:"type"`
	UpdatedAt            *float64      `json:"updated_at"`
	Volume               *float64      `json:"volume"`
}
