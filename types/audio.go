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

// AudioData lists the system's audio outputs and inputs
type AudioData struct {
	Outputs []AudioDevice `json:"outputs" mapstructure:"outputs"`
	Inputs  []AudioDevice `json:"inputs" mapstructure:"inputs"`
}
