package data_module

import (
	"net"
	"strings"

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

	systemData.Hostname = infoStat.Hostname

	systemData.FQDN = getFQDN(systemData.Hostname)

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

// from https://gist.github.com/golightlyb/0d6a0270b0cff882d373dfc6704c5e34
func getFQDN(hostname string) string {
	var err error

	ips, err := net.LookupIP(hostname)
	if err != nil {
		return hostname
	}

	for _, ip := range ips {
		hosts, err := net.LookupAddr(ip.String())
		if err != nil {
			continue
		}

		for _, host := range hosts {
			if strings.LastIndexByte(host, '.') != -1 {
				return strings.TrimSuffix(host, ".")
			}
		}
	}

	return hostname
}
