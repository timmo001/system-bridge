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

// DeviceInfo represents hardware and firmware identity from DMI/SMBIOS.
// Populated best-effort on Linux from /sys/class/dmi/id. Fields that require
// elevated privileges (such as serial numbers) are intentionally omitted.
type DeviceInfo struct {
	Manufacturer *string `json:"manufacturer" mapstructure:"manufacturer"`
	Model        *string `json:"model" mapstructure:"model"`
	Version      *string `json:"version" mapstructure:"version"`
	BoardVendor  *string `json:"board_vendor" mapstructure:"board_vendor"`
	BoardName    *string `json:"board_name" mapstructure:"board_name"`
	BIOSVendor   *string `json:"bios_vendor" mapstructure:"bios_vendor"`
	BIOSVersion  *string `json:"bios_version" mapstructure:"bios_version"`
	ChassisType  *string `json:"chassis_type" mapstructure:"chassis_type"`
}

// SystemData represents system information
type SystemData struct {
	BootTime              uint64       `json:"boot_time" mapstructure:"boot_time"`
	FQDN                  string       `json:"fqdn" mapstructure:"fqdn"`
	Hostname              string       `json:"hostname" mapstructure:"hostname"`
	KernelVersion         string       `json:"kernel_version" mapstructure:"kernel_version"`
	IPAddress4            string       `json:"ip_address_4" mapstructure:"ip_address_4"`
	MACAddress            string       `json:"mac_address" mapstructure:"mac_address"`
	PlatformVersion       string       `json:"platform_version" mapstructure:"platform_version"`
	Platform              string       `json:"platform" mapstructure:"platform"`
	PowerUsage            *float64     `json:"power_usage" mapstructure:"power_usage"`
	Uptime                uint64       `json:"uptime" mapstructure:"uptime"`
	Users                 []SystemUser `json:"users" mapstructure:"users"`
	UUID                  string       `json:"uuid" mapstructure:"uuid"`
	Version               string       `json:"version" mapstructure:"version"`
	CameraUsage           []string     `json:"camera_usage" mapstructure:"camera_usage"`
	MicrophoneUsage       []string     `json:"microphone_usage" mapstructure:"microphone_usage"`
	IPAddress6            string       `json:"ip_address_6" mapstructure:"ip_address_6"`
	PendingReboot         *bool        `json:"pending_reboot" mapstructure:"pending_reboot"`
	RunMode               RunMode      `json:"run_mode" mapstructure:"run_mode"`
	VersionLatestURL      *string      `json:"version_latest_url" mapstructure:"version_latest_url"`
	VersionLatest         *string      `json:"version_latest" mapstructure:"version_latest"`
	VersionNewerAvailable *bool        `json:"version_newer_available" mapstructure:"version_newer_available"`
	DeviceInfo            *DeviceInfo  `json:"device_info" mapstructure:"device_info"`
}
