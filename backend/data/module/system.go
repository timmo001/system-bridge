package data_module

import (
	"runtime"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data/module/system"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/system"
	"github.com/timmo001/system-bridge/version"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

func (t *Module) UpdateSystemModule() (types.SystemData, error) {
	log.Info("Getting system data")

	// Initialize arrays
	var systemData types.SystemData
	systemData.Users = make([]system.SystemUser, 0)
	systemData.CameraUsage = make([]string, 0)

	bootTime, err := system.GetBootTime()
	if err != nil {
		log.Errorf("Failed to get boot time: %v", err)
		bootTime = 0
	}
	systemData.BootTime = bootTime

	fqdn, err := system.GetFQDN()
	if err != nil {
		log.Errorf("Failed to get FQDN: %v", err)
		fqdn = ""
	}
	systemData.FQDN = fqdn

	hostname, err := system.GetHostname()
	if err != nil {
		log.Errorf("Failed to get hostname: %v", err)
		hostname = ""
	}
	systemData.Hostname = hostname

	ipAddress4, err := system.GetIPAddress4()
	if err != nil {
		log.Errorf("Failed to get IP address: %v", err)
		ipAddress4 = ""
	}
	systemData.IPAddress4 = ipAddress4

	macAddress, err := system.GetMACAddress()
	if err != nil {
		log.Errorf("Failed to get MAC address: %v", err)
		macAddress = ""
	}
	systemData.MACAddress = macAddress

	platformVersion, err := system.GetPlatformVersion()
	if err != nil {
		log.Errorf("Failed to get platform version: %v", err)
		platformVersion = ""
	}
	systemData.PlatformVersion = platformVersion

	platform := cases.Title(language.English).String(runtime.GOOS)
	systemData.Platform = platform

	uptime, err := system.GetUptime()
	if err != nil {
		log.Errorf("Failed to get uptime: %v", err)
		uptime = 0
	}
	systemData.Uptime = uptime

	users, err := system.GetUsers()
	if err != nil {
		log.Errorf("Failed to get users: %v", err)
		users = make([]system.SystemUser, 0)
	}
	systemData.Users = users

	uuid, err := system.GetUUID()
	if err != nil {
		log.Errorf("Failed to get UUID: %v", err)
		uuid = "123e4567-e89b-12d3-a456-426614174000" // Fallback to a default UUID
	}
	systemData.UUID = uuid

	// Get version information
	currentVersion := version.Version
	latestVersion, err := version.GetLatestVersion()
	if err != nil {
		log.Errorf("Failed to get latest version: %v", err)
		latestVersion = currentVersion
	}

	versionNewerAvailable := version.IsNewerVersionAvailable(currentVersion, latestVersion)

	systemData.RunMode = types.RunModeStandalone // Always set RunMode to standalone
	systemData.Version = currentVersion
	systemData.VersionLatest = &latestVersion
	systemData.VersionLatestURL = &version.LatestVersionUserURL
	systemData.VersionNewerAvailable = &versionNewerAvailable

	return systemData, nil
}
