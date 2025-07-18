package data_module

import (
	"context"
	"errors"
	"net"
	"os"
	"strings"

	"log/slog"

	"github.com/shirou/gopsutil/v4/host"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/version"
)

type SystemModule struct{}

func (sm SystemModule) Name() types.ModuleName { return types.ModuleSystem }
func (sm SystemModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting system data")

	// Initialize arrays
	var systemData types.SystemData
	systemData.Users = make([]types.SystemUser, 0)
	systemData.CameraUsage = make([]string, 0)

	infoStat, err := host.Info()
	if err != nil {
		slog.Error("Failed to get system info", "error", err)
	}

	users, err := host.Users()
	if err != nil {
		slog.Warn("Failed to get user info", "error", err)
	}

	systemData.BootTime = infoStat.BootTime

	systemData.Hostname = infoStat.Hostname

	systemData.IPAddress4 = getIPv4Address()
	systemData.IPAddress6 = getIPv6Address()
	systemData.MACAddress = getMACAddress()

	hostname, err := os.Hostname()
	if err != nil {
		hostname = infoStat.Hostname
	}
	systemData.FQDN = getFQDN(hostname)

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
		slog.Error("Failed to get latest version", "error", err)
		latestVersion = currentVersion
	}

	versionNewerAvailable := version.IsNewerVersionAvailable(currentVersion, latestVersion)

	systemData.Version = currentVersion
	systemData.VersionLatest = &latestVersion
	systemData.VersionLatestURL = &version.LatestVersionUserURL
	systemData.VersionNewerAvailable = &versionNewerAvailable

	return systemData, nil
}

// getIPv4Address gets the primary IPv4 address
func getIPv4Address() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		slog.Warn("Failed to get IPv4 Address", "error", err)
		return ""
	}
	defer func() {
		err = errors.Join(err, conn.Close())
	}()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

// getIPv6Address gets the primary IPv6 address
func getIPv6Address() string {
	// Try to connect to IPv6 DNS server to get our IPv6 address
	conn, err := net.Dial("udp6", "[2001:4860:4860::8888]:80")
	if err != nil {
		slog.Warn("Failed to get IPv6 Address", "error", err)
		return ""
	}
	defer func() {
		err = errors.Join(err, conn.Close())
	}()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

// getMACAddress gets the MAC address of the primary interface
func getMACAddress() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		slog.Warn("Failed to get MAC Address", "error", err)
		return ""
	}

	for _, iface := range interfaces {
		// Skip loopback and interfaces without MAC
		if iface.Flags&net.FlagLoopback == 0 && len(iface.HardwareAddr) > 0 {
			return iface.HardwareAddr.String()
		}
	}

	slog.Info("No MAC address found")
	return ""
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
