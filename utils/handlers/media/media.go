package media

// MediaAction represents the type of media control action
type MediaAction string

const (
	// MediaActionPlay represents the play action
	MediaActionPlay MediaAction = "play"
	// MediaActionPause represents the pause action
	MediaActionPause MediaAction = "pause"
	// MediaActionNext represents the next track action
	MediaActionNext MediaAction = "next"
	// MediaActionPrevious represents the previous track action
	MediaActionPrevious MediaAction = "previous"
	// MediaActionStop represents the stop action
	MediaActionStop MediaAction = "stop"
	// MediaActionVolumeUp represents the volume up action
	MediaActionVolumeUp MediaAction = "volume_up"
	// MediaActionVolumeDown represents the volume down action
	MediaActionVolumeDown MediaAction = "volume_down"
	// MediaActionMute represents the mute action
	MediaActionMute MediaAction = "mute"
)

// Control sends a media control command
func Control(action MediaAction) error {
	return control(action)
}
