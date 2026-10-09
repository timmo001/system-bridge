package types

// DiscordData represents the state of the local Discord client
type DiscordData struct {
	Connected      bool                    `json:"connected"`
	Authenticated  bool                    `json:"authenticated"`
	User           *DiscordUser            `json:"user"`
	Call           *DiscordCall            `json:"call"`
	Mute           *bool                   `json:"mute"`
	Deaf           *bool                   `json:"deaf"`
	Input          *DiscordAudio           `json:"input"`
	Output         *DiscordAudio           `json:"output"`
	Mode           *DiscordVoiceMode       `json:"mode"`
	Processing     *DiscordVoiceProcessing `json:"processing"`
	QoS            *bool                   `json:"qos"`
	SilenceWarning *bool                   `json:"silence_warning"`
}

// DiscordUser is the Discord account System Bridge is authorized as
type DiscordUser struct {
	ID         string  `json:"id"`
	Username   string  `json:"username"`
	GlobalName *string `json:"global_name"`
	AvatarURL  *string `json:"avatar_url"`
}

// DiscordCall is the voice channel the user is in
type DiscordCall struct {
	Channel    DiscordChannel          `json:"channel"`
	Server     *DiscordServer          `json:"server"`
	Connection *DiscordVoiceConnection `json:"connection"`
	Me         *DiscordCallMember      `json:"me"`
}

// DiscordChannel is a Discord channel
type DiscordChannel struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Type      *string `json:"type"`
	Bitrate   *int    `json:"bitrate"`
	UserLimit *int    `json:"user_limit"`
}

// DiscordServer is a Discord server, which Discord's API calls a guild
type DiscordServer struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	IconURL *string `json:"icon_url"`
}

// DiscordVoiceConnection is the state of the user's voice connection
type DiscordVoiceConnection struct {
	State       string   `json:"state"`
	LastPing    *float64 `json:"last_ping"`
	AveragePing *float64 `json:"average_ping"`
}

// DiscordCallMember is a user's state in a voice channel
type DiscordCallMember struct {
	Nick       *string `json:"nick"`
	ServerMute bool    `json:"server_mute"`
	ServerDeaf bool    `json:"server_deaf"`
	Suppress   bool    `json:"suppress"`
	Speaking   bool    `json:"speaking"`
}

// DiscordAudio is the Discord input or output audio setup
type DiscordAudio struct {
	Volume   *float64        `json:"volume"`
	DeviceID *string         `json:"device_id"`
	Devices  []DiscordDevice `json:"devices"`
}

// DiscordDevice is an audio device Discord can use
type DiscordDevice struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// DiscordVoiceMode is how Discord decides when to transmit
type DiscordVoiceMode struct {
	Type          *string  `json:"type"`
	AutoThreshold *bool    `json:"auto_threshold"`
	Threshold     *float64 `json:"threshold"`
	Delay         *float64 `json:"delay"`
}

// DiscordVoiceProcessing is Discord's microphone processing
type DiscordVoiceProcessing struct {
	NoiseSuppression     *bool `json:"noise_suppression"`
	EchoCancellation     *bool `json:"echo_cancellation"`
	AutomaticGainControl *bool `json:"automatic_gain_control"`
}
