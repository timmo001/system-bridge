package types

// AudioDevice is an audio output, such as speakers or headphones, or an
// input, such as a microphone
type AudioDevice struct {
	ID      string   `json:"id" mapstructure:"id"`
	Name    string   `json:"name" mapstructure:"name"`
	Volume  *float64 `json:"volume" mapstructure:"volume"` // Percent, the average of the channels
	Muted   *bool    `json:"muted" mapstructure:"muted"`
	Default bool     `json:"default" mapstructure:"default"`
}

// AudioApp is an app playing sound, which can be turned up, down or muted on
// its own
type AudioApp struct {
	ID      string   `json:"id" mapstructure:"id"`
	Name    string   `json:"name" mapstructure:"name"`
	Title   *string  `json:"title" mapstructure:"title"`   // What it says it's playing, such as a track
	Volume  *float64 `json:"volume" mapstructure:"volume"` // Percent, the average of the channels
	Muted   *bool    `json:"muted" mapstructure:"muted"`
	Playing bool     `json:"playing" mapstructure:"playing"` // False while it's paused
	Output  *string  `json:"output" mapstructure:"output"`   // The id of the output it plays to
}

// AudioData lists the system's audio outputs and inputs, and the apps
// playing sound
type AudioData struct {
	Outputs []AudioDevice `json:"outputs" mapstructure:"outputs"`
	Inputs  []AudioDevice `json:"inputs" mapstructure:"inputs"`
	Apps    []AudioApp    `json:"apps" mapstructure:"apps"` // Linux only, empty elsewhere
}
