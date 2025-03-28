package data_module

import (
	"runtime"

	"github.com/charmbracelet/log"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

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

	bootTime, err := getBootTime()
	if err != nil {
		log.Errorf("Failed to get boot time: %v", err)
		bootTime = 0
	}

	fqdn, err := getFQDN()
	if err != nil {
		log.Errorf("Failed to get FQDN: %v", err)
		fqdn = "unknown"
	}

	hostname, err := getHostname()
	if err != nil {
		log.Errorf("Failed to get hostname: %v", err)
		hostname = "unknown"
	}

	ipAddress4, err := getIPAddress4()
	if err != nil {
		log.Errorf("Failed to get IP address: %v", err)
		ipAddress4 = "unknown"
	}

	macAddress, err := getMACAddress()
	if err != nil {
		log.Errorf("Failed to get MAC address: %v", err)
		macAddress = "unknown"
	}

	platformVersion, err := getPlatformVersion()
	if err != nil {
		log.Errorf("Failed to get platform version: %v", err)
		platformVersion = "unknown"
	}

	platform := cases.Title(language.English).String(runtime.GOOS)

	uptime, err := getUptime()
	if err != nil {
		log.Errorf("Failed to get uptime: %v", err)
		uptime = 0
	}

	users, err := getUsers()
	if err != nil {
		log.Errorf("Failed to get users: %v", err)
		users = []SystemUser{}
	}

	uuid, err := getUUID()
	if err != nil {
		log.Errorf("Failed to get UUID: %v", err)
		uuid = "123e4567-e89b-12d3-a456-426614174000" // Fallback to a default UUID
	}

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
