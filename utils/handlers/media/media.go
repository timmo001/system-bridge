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
)

// Control sends a media control command
func Control(action MediaAction) error {
	return control(action)
}
