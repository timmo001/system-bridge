package data_module

import (
	"runtime"

	"github.com/charmbracelet/log"
	system_utils "github.com/timmo001/system-bridge/utils/system"
	"github.com/timmo001/system-bridge/version"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

type RunMode string

const (
	RunModeStandalone RunMode = "standalone"
)

// SystemData represents system information
type SystemData struct {
	BootTime              float64                   `json:"boot_time" mapstructure:"boot_time"`
	FQDN                  string                    `json:"fqdn" mapstructure:"fqdn"`
	Hostname              string                    `json:"hostname" mapstructure:"hostname"`
	IPAddress4            string                    `json:"ip_address_4" mapstructure:"ip_address_4"`
	MACAddress            string                    `json:"mac_address" mapstructure:"mac_address"`
	PlatformVersion       string                    `json:"platform_version" mapstructure:"platform_version"`
	Platform              string                    `json:"platform" mapstructure:"platform"`
	Uptime                float64                   `json:"uptime" mapstructure:"uptime"`
	Users                 []system_utils.SystemUser `json:"users" mapstructure:"users"`
	UUID                  string                    `json:"uuid" mapstructure:"uuid"`
	Version               string                    `json:"version" mapstructure:"version"`
	CameraUsage           []string                  `json:"camera_usage" mapstructure:"camera_usage"`
	IPAddress6            *string                   `json:"ip_address_6" mapstructure:"ip_address_6"`
	PendingReboot         *bool                     `json:"pending_reboot" mapstructure:"pending_reboot"`
	RunMode               RunMode                   `json:"run_mode" mapstructure:"run_mode"`
	VersionLatestURL      *string                   `json:"version_latest_url" mapstructure:"version_latest_url"`
	VersionLatest         *string                   `json:"version_latest" mapstructure:"version_latest"`
	VersionNewerAvailable *bool                     `json:"version_newer_available" mapstructure:"version_newer_available"`
}

func (t *Module) UpdateSystemModule() (SystemData, error) {
	log.Info("Getting system data")

	bootTime, err := system_utils.GetBootTime()
	if err != nil {
		log.Errorf("Failed to get boot time: %v", err)
		bootTime = 0
	}

	fqdn, err := system_utils.GetFQDN()
	if err != nil {
		log.Errorf("Failed to get FQDN: %v", err)
		fqdn = ""
	}

	hostname, err := system_utils.GetHostname()
	if err != nil {
		log.Errorf("Failed to get hostname: %v", err)
		hostname = ""
	}

	ipAddress4, err := system_utils.GetIPAddress4()
	if err != nil {
		log.Errorf("Failed to get IP address: %v", err)
		ipAddress4 = ""
	}

	macAddress, err := system_utils.GetMACAddress()
	if err != nil {
		log.Errorf("Failed to get MAC address: %v", err)
		macAddress = ""
	}

	platformVersion, err := system_utils.GetPlatformVersion()
	if err != nil {
		log.Errorf("Failed to get platform version: %v", err)
		platformVersion = ""
	}

	platform := cases.Title(language.English).String(runtime.GOOS)

	uptime, err := system_utils.GetUptime()
	if err != nil {
		log.Errorf("Failed to get uptime: %v", err)
		uptime = 0
	}

	users, err := system_utils.GetUsers()
	if err != nil {
		log.Errorf("Failed to get users: %v", err)
		users = []system_utils.SystemUser{}
	}

	uuid, err := system_utils.GetUUID()
	if err != nil {
		log.Errorf("Failed to get UUID: %v", err)
		uuid = "123e4567-e89b-12d3-a456-426614174000" // Fallback to a default UUID
	}

	// Get version information
	currentVersion := version.Version
	latestVersion, err := version.GetLatestVersion()
	if err != nil {
		log.Errorf("Failed to get latest version: %v", err)
		latestVersion = currentVersion
	}

	versionNewerAvailable := version.IsNewerVersionAvailable(currentVersion, latestVersion)

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
		Version:               currentVersion,
		VersionLatest:         &latestVersion,
		VersionLatestURL:      &version.LatestVersionUserURL,
		VersionNewerAvailable: &versionNewerAvailable,
	}, nil
}
