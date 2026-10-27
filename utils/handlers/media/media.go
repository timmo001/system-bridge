package media

// MediaAction represents the type of media control action
type MediaAction string

const (
	// MediaActionPlay represents the play action
	MediaActionPlay MediaAction = "PLAY"
	// MediaActionPause represents the pause action
	MediaActionPause MediaAction = "PAUSE"
	// MediaActionNext represents the next track action
	MediaActionNext MediaAction = "NEXT"
	// MediaActionPrevious represents the previous track action
	MediaActionPrevious MediaAction = "PREVIOUS"
	// MediaActionStop represents the stop action
	MediaActionStop MediaAction = "STOP"
	// MediaActionVolumeUp represents the volume up action
	MediaActionVolumeUp MediaAction = "VOLUME_UP"
	// MediaActionVolumeDown represents the volume down action
	MediaActionVolumeDown MediaAction = "VOLUME_DOWN"
	// MediaActionMute represents the mute action
	MediaActionMute MediaAction = "MUTE"
	// MediaActionSeek moves to Request.Position
	MediaActionSeek MediaAction = "SEEK"
	// MediaActionSetVolume sets the player's volume to Request.Volume
	MediaActionSetVolume MediaAction = "SET_VOLUME"
	// MediaActionSetShuffle turns shuffle on or off, from Request.Shuffle
	MediaActionSetShuffle MediaAction = "SET_SHUFFLE"
	// MediaActionSetRepeat sets repeat to Request.Repeat
	MediaActionSetRepeat MediaAction = "SET_REPEAT"
)

// Request is one media control. Player is a player's ID from the media
// module's players, or empty for the player the module reports. Position,
// Volume, Shuffle and Repeat are the values SEEK, SET_VOLUME, SET_SHUFFLE and
// SET_REPEAT need.
type Request struct {
	Action   MediaAction
	Player   string
	Position *float64 // Seconds from the start of the track
	Volume   *float64 // 0 to 1
	Shuffle  *bool
	Repeat   string // NONE, TRACK or LIST
}

// Control sends a media control command
func Control(request Request) error {
	return control(request)
}
