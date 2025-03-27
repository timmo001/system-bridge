package data_module

import (
	"github.com/charmbracelet/log"
)

// RunMode represents the system run mode
type RunMode string

const (
	// RunModeStandalone represents standalone mode
	RunModeStandalone RunMode = "standalone"
)

// SystemUser represents information about a system user
type SystemUser struct {
	Name     string  `json:"name" mapstructure:"name"`
	Active   bool    `json:"active" mapstructure:"active"`
	Terminal string  `json:"terminal" mapstructure:"terminal"`
	Host     string  `json:"host" mapstructure:"host"`
	Started  float64 `json:"started" mapstructure:"started"`
	PID      float64 `json:"pid" mapstructure:"pid"`
}

// SystemData represents system information
type SystemData struct {
	BootTime              float64      `json:"boot_time" mapstructure:"boot_time"`
	FQDN                  string       `json:"fqdn" mapstructure:"fqdn"`
	Hostname              string       `json:"hostname" mapstructure:"hostname"`
	IPAddress4            string       `json:"ip_address_4" mapstructure:"ip_address_4"`
	MACAddress            string       `json:"mac_address" mapstructure:"mac_address"`
	PlatformVersion       string       `json:"platform_version" mapstructure:"platform_version"`
	Platform              string       `json:"platform" mapstructure:"platform"`
	Uptime                float64      `json:"uptime" mapstructure:"uptime"`
	Users                 []SystemUser `json:"users" mapstructure:"users"`
	UUID                  string       `json:"uuid" mapstructure:"uuid"`
	Version               string       `json:"version" mapstructure:"version"`
	CameraUsage           []string     `json:"camera_usage,omitempty" mapstructure:"camera_usage,omitempty"`
	IPAddress6            *string      `json:"ip_address_6,omitempty" mapstructure:"ip_address_6,omitempty"`
	PendingReboot         *bool        `json:"pending_reboot,omitempty" mapstructure:"pending_reboot,omitempty"`
	RunMode               RunMode      `json:"run_mode" mapstructure:"run_mode"`
	VersionLatestURL      *string      `json:"version_latest_url,omitempty" mapstructure:"version_latest_url,omitempty"`
	VersionLatest         *string      `json:"version_latest,omitempty" mapstructure:"version_latest,omitempty"`
	VersionNewerAvailable *bool        `json:"version_newer_available,omitempty" mapstructure:"version_newer_available,omitempty"`
}

func (t *Module) UpdateSystemModule() (SystemData, error) {
	log.Info("Getting system data")

	// TODO: Implement actual system data collection
	bootTime := float64(0.0)                                                        //  TODO: Get actual boot time
	fqdn := "example.com"                                                           // TODO: Get actual FQDN
	hostname := "example"                                                           // TODO: Get actual hostname
	ipAddress4 := "192.168.1.1"                                                     // TODO: Get actual IP address
	macAddress := "00:00:00:00:00:00"                                               // TODO: Get actual MAC address
	platformVersion := "1.0.0"                                                      // TODO: Get actual platform version
	platform := "Linux"                                                             // TODO: Get actual platform
	uptime := float64(0.0)                                                          // TODO: Get actual uptime
	users := []SystemUser{}                                                         // TODO: Get actual users
	uuid := "123e4567-e89b-12d3-a456-426614174000"                                  // TODO: Get actual UUID
	version := "5.0.0"                                                              // TODO: Get actual version
	versionLatest := "5.0.0"                                                        // TODO: Get actual version
	versionLatestURL := "https://github.com/timmo001/system-bridge/releases/latest" // TODO: Get actual URL
	versionNewerAvailable := false                                                  // TODO: Get actual value

	return SystemData{
		BootTime:              bootTime,
		FQDN:                  fqdn,
		Hostname:              hostname,
		IPAddress4:            ipAddress4,
		MACAddress:            macAddress,
		PlatformVersion:       platformVersion,
		Platform:              platform,
		Uptime:                uptime,
		Users:                 users,
		UUID:                  uuid,
		RunMode:               RunModeStandalone, // Always set RunMode to standalone
		Version:               version,
		VersionLatest:         &versionLatest,
		VersionLatestURL:      &versionLatestURL,
		VersionNewerAvailable: &versionNewerAvailable,
	}, nil
}
