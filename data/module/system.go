package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/version"
)

func (t *Module) UpdateSystemModule() (types.SystemData, error) {
	log.Info("Getting system data")

	// Initialize arrays
	var systemData types.SystemData
	systemData.Users = make([]types.SystemUser, 0)
	systemData.CameraUsage = make([]string, 0)

	infoStat, err := host.Info()
	if err != nil {
		log.Errorf("Failed to get  system info: %v", err)
	}

	users, err := host.Users()
	if err != nil {
		log.Errorf("Failed to get  user info: %v", err)
	}

	systemData.BootTime = infoStat.BootTime

	// TODO: add fqdn
	systemData.FQDN = ""

	systemData.Hostname = infoStat.Hostname

	// TODO: add ip address
	systemData.IPAddress4 = ""

	// TODO: add mac address
	systemData.MACAddress = ""

	systemData.PlatformVersion = infoStat.PlatformVersion
	systemData.Platform = infoStat.Platform
	systemData.Uptime = infoStat.Uptime

	for _, userStat := range users {
		systemData.Users = append(systemData.Users, types.SystemUser{
			Name:     userStat.User,
			Terminal: userStat.Terminal,
			Host:     userStat.Host,
			Started:  userStat.Started,
			// TODO: add PID
			// TODO: add Active
		})
	}

	systemData.UUID = infoStat.HostID

	systemData.RunMode = types.RunModeStandalone // Always set RunMode to standalone

	// Get version information
	currentVersion := version.Version
	latestVersion, err := version.GetLatestVersion()
	if err != nil {
		log.Errorf("Failed to get latest version: %v", err)
		latestVersion = currentVersion
	}

	versionNewerAvailable := version.IsNewerVersionAvailable(currentVersion, latestVersion)

	systemData.Version = currentVersion
	systemData.VersionLatest = &latestVersion
	systemData.VersionLatestURL = &version.LatestVersionUserURL
	systemData.VersionNewerAvailable = &versionNewerAvailable

	return systemData, nil
}
