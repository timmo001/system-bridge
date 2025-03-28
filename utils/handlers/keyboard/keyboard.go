package keyboard

// KeypressData represents the data needed for a keyboard keypress
type KeypressData struct {
	Key       string   `json:"key" mapstructure:"key"`
	Modifiers []string `json:"modifiers" mapstructure:"modifiers"`
	Delay     int      `json:"delay" mapstructure:"delay"` // Delay in milliseconds
}

// SendKeypress sends a keyboard keypress with optional modifiers and delay
func SendKeypress(data KeypressData) error {
	return sendKeypress(data)
}

// SendText sends text input
func SendText(text string) error {
	return sendText(text)
}
