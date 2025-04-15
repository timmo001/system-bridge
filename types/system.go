package types

type RunMode string

const (
	RunModeStandalone RunMode = "standalone"
)

// SystemUser represents information about a system user
type SystemUser struct {
	Name     string  `json:"name" mapstructure:"name"`
	Active   bool    `json:"active" mapstructure:"active"`
	Terminal string  `json:"terminal" mapstructure:"terminal"`
	Host     string  `json:"host" mapstructure:"host"`
	Started  int     `json:"started" mapstructure:"started"`
	PID      float64 `json:"pid" mapstructure:"pid"`
}

// SystemData represents system information
type SystemData struct {
	BootTime              uint64       `json:"boot_time" mapstructure:"boot_time"`
	FQDN                  string       `json:"fqdn" mapstructure:"fqdn"`
	Hostname              string       `json:"hostname" mapstructure:"hostname"`
	IPAddress4            string       `json:"ip_address_4" mapstructure:"ip_address_4"`
	MACAddress            string       `json:"mac_address" mapstructure:"mac_address"`
	PlatformVersion       string       `json:"platform_version" mapstructure:"platform_version"`
	Platform              string       `json:"platform" mapstructure:"platform"`
	Uptime                uint64       `json:"uptime" mapstructure:"uptime"`
	Users                 []SystemUser `json:"users" mapstructure:"users"`
	UUID                  string       `json:"uuid" mapstructure:"uuid"`
	Version               string       `json:"version" mapstructure:"version"`
	CameraUsage           []string     `json:"camera_usage" mapstructure:"camera_usage"`
	IPAddress6            *string      `json:"ip_address_6" mapstructure:"ip_address_6"`
	PendingReboot         *bool        `json:"pending_reboot" mapstructure:"pending_reboot"`
	RunMode               RunMode      `json:"run_mode" mapstructure:"run_mode"`
	VersionLatestURL      *string      `json:"version_latest_url" mapstructure:"version_latest_url"`
	VersionLatest         *string      `json:"version_latest" mapstructure:"version_latest"`
	VersionNewerAvailable *bool        `json:"version_newer_available" mapstructure:"version_newer_available"`
}
