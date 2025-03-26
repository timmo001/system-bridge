package data_module

import "github.com/charmbracelet/log"

// RunMode represents the system run mode
type RunMode string

const (
	// RunModeStandalone represents standalone mode
	RunModeStandalone RunMode = "standalone"
)

// SystemUser represents information about a system user
type SystemUser struct {
	Name     string  `json:"name"`
	Active   bool    `json:"active"`
	Terminal string  `json:"terminal"`
	Host     string  `json:"host"`
	Started  float64 `json:"started"`
	PID      float64 `json:"pid"`
}

// SystemData represents system information
type SystemData struct {
	BootTime              float64      `json:"boot_time"`
	FQDN                  string       `json:"fqdn"`
	Hostname              string       `json:"hostname"`
	IPAddress4            string       `json:"ip_address_4"`
	MACAddress            string       `json:"mac_address"`
	PlatformVersion       string       `json:"platform_version"`
	Platform              string       `json:"platform"`
	Uptime                float64      `json:"uptime"`
	Users                 []SystemUser `json:"users"`
	UUID                  string       `json:"uuid"`
	Version               string       `json:"version"`
	CameraUsage           []string     `json:"camera_usage,omitempty"`
	IPAddress6            *string      `json:"ip_address_6,omitempty"`
	PendingReboot         *bool        `json:"pending_reboot,omitempty"`
	RunMode               RunMode      `json:"run_mode"`
	VersionLatestURL      *string      `json:"version_latest_url,omitempty"`
	VersionLatest         *string      `json:"version_latest,omitempty"`
	VersionNewerAvailable *bool        `json:"version_newer_available,omitempty"`
}

func (t *Module) UpdateSystemModule() (SystemData, error) {
	log.Info("Getting system data")

	// TODO: Implement actual system data collection
	return SystemData{
		// Always set RunMode to standalone
		RunMode: RunModeStandalone,
	}, nil
}
