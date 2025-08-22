package data_module

import (
	"context"
	"errors"
	"net"
	"os"
	"strings"

	"log/slog"

	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/process"
	"github.com/timmo001/system-bridge/data/module/system"
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

	// Build a map of username -> representative PID and activity by scanning processes.
	// We choose the earliest-started process for each user as the representative PID.
	type userProcessInfo struct {
		pid         int32
		createTime  int64
		hasProcess  bool
		displayName string
	}

	normalizeUsername := func(name string) string {
		if name == "" {
			return name
		}
		// Strip domain prefixes commonly formatted as DOMAIN\\user or domain/user
		if idx := strings.LastIndex(name, "\\"); idx != -1 {
			name = name[idx+1:]
		}
		if idx := strings.LastIndex(name, "/"); idx != -1 {
			name = name[idx+1:]
		}
		return strings.ToLower(name)
	}

	userToProc := make(map[string]userProcessInfo)
	if procs, perr := process.Processes(); perr != nil {
		slog.Warn("Failed to enumerate processes for user activity", "error", perr)
	} else {
		for _, p := range procs {
			uname, uerr := p.Username()
			if uerr != nil || uname == "" {
				continue
			}
			created, cerr := p.CreateTime()
			if cerr != nil {
				continue
			}
			key := normalizeUsername(uname)
			info, exists := userToProc[key]
			if !exists || (created > 0 && (info.createTime == 0 || created < info.createTime)) {
				userToProc[key] = userProcessInfo{pid: p.Pid, createTime: created, hasProcess: true, displayName: uname}
			} else if exists {
				// Mark as having at least one process even if we keep the earliest PID
				info.hasProcess = true
				userToProc[key] = info
			}
		}
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
	// Kernel version for HA "Kernel" sensor (docs expect kernel version)
	systemData.KernelVersion = infoStat.KernelVersion
	systemData.Platform = infoStat.Platform
	systemData.Uptime = infoStat.Uptime

	if len(users) > 0 {
		for _, userStat := range users {
			usernameKey := normalizeUsername(userStat.User)
			upi, ok := userToProc[usernameKey]
			var pidFloat float64
			var isActive bool
			if ok {
				pidFloat = float64(upi.pid)
				isActive = upi.hasProcess
			}

			systemData.Users = append(systemData.Users, types.SystemUser{
				Name:     userStat.User,
				Active:   isActive,
				Terminal: userStat.Terminal,
				Host:     userStat.Host,
				Started:  userStat.Started,
				PID:      pidFloat,
			})
		}
	} else {
		// Fallback for platforms where host.Users() is not implemented
		for _, upi := range userToProc {
			started := int(upi.createTime / 1000)
			name := upi.displayName
			if name == "" {
				name = "unknown"
			}
			systemData.Users = append(systemData.Users, types.SystemUser{
				Name:     name,
				Active:   upi.hasProcess,
				Terminal: "",
				Host:     "",
				Started:  started,
				PID:      float64(upi.pid),
			})
		}
	}

	systemData.UUID = infoStat.HostID

	systemData.RunMode = types.RunModeStandalone // Always set RunMode to standalone

	// Populate optional fields when available per-OS
	// Linux: detect camera usage processes and pending reboot via subpackage helpers
	if infoStat.OS == "linux" || infoStat.Platform == "linux" || strings.Contains(strings.ToLower(infoStat.Platform), "arch") || strings.Contains(strings.ToLower(infoStat.Platform), "ubuntu") || strings.Contains(strings.ToLower(infoStat.Platform), "debian") {
		if cu := system.GetCameraUsage(); len(cu) > 0 {
			systemData.CameraUsage = cu
		}
		if pr := system.GetPendingReboot(); pr != nil {
			systemData.PendingReboot = pr
		}
	}

	// Get version information
	currentVersion := version.APIVersion()
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
