package types

// DiscordData represents the state of the local Discord client
type DiscordData struct {
	Connected     bool     `json:"connected"`
	Authenticated bool     `json:"authenticated"`
	Mute          *bool    `json:"mute"`
	Deaf          *bool    `json:"deaf"`
	InputVolume   *float64 `json:"input_volume"`
	OutputVolume  *float64 `json:"output_volume"`
}
