package notification

// NotificationData represents the data needed for a notification
type NotificationData struct {
	Title    string `json:"title" mapstructure:"title"`
	Message  string `json:"message" mapstructure:"message"`
	Icon     string `json:"icon,omitempty" mapstructure:"icon"`
	Duration int    `json:"duration,omitempty" mapstructure:"duration"` // Duration in milliseconds
}

// Send sends a notification
func Send(data NotificationData) error {
	return send(data)
}
