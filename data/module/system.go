package data_module

import (
	"context"
	"errors"
	"net"
	"os"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/version"
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
	IPAddress6            string       `json:"ip_address_6" mapstructure:"ip_address_6"`
	PendingReboot         bool         `json:"pending_reboot" mapstructure:"pending_reboot"`
	RunMode               RunMode      `json:"run_mode" mapstructure:"run_mode"`
	VersionLatestURL      string       `json:"version_latest_url" mapstructure:"version_latest_url"`
	VersionLatest         string       `json:"version_latest" mapstructure:"version_latest"`
	VersionNewerAvailable bool         `json:"version_newer_available" mapstructure:"version_newer_available"`
}

func (sd SystemData) Name() types.ModuleName { return types.ModuleSystem }
func (sd SystemData) Update(ctx context.Context) (any, error) {
	log.Info("Getting system data")

	// Initialize arrays
	sd.Users = make([]SystemUser, 0)
	sd.CameraUsage = make([]string, 0)

	infoStat, err := host.Info()
	if err != nil {
		log.Errorf("Failed to get system info: %v", err)
	}

	users, err := host.Users()
	if err != nil {
		log.Warnf("Failed to get user info: %v", err)
	}

	sd.BootTime = infoStat.BootTime

	sd.Hostname = infoStat.Hostname

	sd.IPAddress4 = getIPv4Address()
	sd.IPAddress6 = getIPv6Address()
	sd.MACAddress = getMACAddress()

	hostname, err := os.Hostname()
	if err != nil {
		hostname = infoStat.Hostname
	}
	sd.FQDN = getFQDN(hostname)

	sd.PlatformVersion = infoStat.PlatformVersion
	sd.Platform = infoStat.Platform
	sd.Uptime = infoStat.Uptime

	for _, userStat := range users {
		sd.Users = append(sd.Users, SystemUser{
			Name:     userStat.User,
			Terminal: userStat.Terminal,
			Host:     userStat.Host,
			Started:  userStat.Started,
			// TODO: add PID
			// TODO: add Active
		})
	}

	sd.UUID = infoStat.HostID

	sd.RunMode = RunModeStandalone // Always set RunMode to standalone

	// Get version information
	currentVersion := version.Version
	latestVersion, err := version.GetLatestVersion()
	if err != nil {
		log.Errorf("Failed to get latest version: %v", err)
		latestVersion = currentVersion
	}

	versionNewerAvailable := version.IsNewerVersionAvailable(currentVersion, latestVersion)

	sd.Version = currentVersion
	sd.VersionLatest = latestVersion
	sd.VersionLatestURL = version.LatestVersionUserURL
	sd.VersionNewerAvailable = versionNewerAvailable

	return sd, nil
}

// getIPv4Address gets the primary IPv4 address
func getIPv4Address() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		log.Warnf("Failed to get IPv4 Address: %v", err)
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
		log.Warnf("Failed to get IPv6 Address: %v", err)
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
		log.Warn("Failed to get MAC Address: %v", err)
		return ""
	}

	for _, iface := range interfaces {
		// Skip loopback and interfaces without MAC
		if iface.Flags&net.FlagLoopback == 0 && len(iface.HardwareAddr) > 0 {
			return iface.HardwareAddr.String()
		}
	}

	log.Info("No MAC address found")
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
