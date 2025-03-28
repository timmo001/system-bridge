package data_module

import (
	"fmt"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// windowsSystemInfoCache stores the parsed systeminfo output
var windowsSystemInfoCache struct {
	lines []string
	err   error
}

// windowsIPConfigCache stores the parsed ipconfig output
var windowsIPConfigCache struct {
	lines []string
	err   error
}

// getWindowsSystemInfo returns the raw systeminfo output for Windows
func getWindowsSystemInfo() ([]string, error) {
	// Return cached result if available
	if windowsSystemInfoCache.lines != nil || windowsSystemInfoCache.err != nil {
		return windowsSystemInfoCache.lines, windowsSystemInfoCache.err
	}

	cmd := exec.Command("systeminfo", "/fo", "csv", "/nh")
	output, err := cmd.Output()
	if err != nil {
		windowsSystemInfoCache.err = err
		return nil, err
	}
	windowsSystemInfoCache.lines = strings.Split(string(output), "\r\n")
	return windowsSystemInfoCache.lines, nil
}

// getWindowsIPConfig returns the raw ipconfig output for Windows
func getWindowsIPConfig() ([]string, error) {
	// Return cached result if available
	if windowsIPConfigCache.lines != nil || windowsIPConfigCache.err != nil {
		return windowsIPConfigCache.lines, windowsIPConfigCache.err
	}

	cmd := exec.Command("ipconfig", "/all")
	output, err := cmd.Output()
	if err != nil {
		windowsIPConfigCache.err = err
		return nil, err
	}
	windowsIPConfigCache.lines = strings.Split(string(output), "\r\n")
	return windowsIPConfigCache.lines, nil
}

// SystemInfo contains boot time and uptime information
type SystemInfo struct {
	BootTime float64
	Uptime   float64
}

// getSystemInfo returns both boot time and uptime information
func getSystemInfo() (SystemInfo, error) {
	switch runtime.GOOS {
	case "windows":
		return getWindowsTimeInfo()
	case "darwin":
		return getDarwinInfo()
	case "linux":
		return getLinuxInfo()
	default:
		return SystemInfo{}, fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// getWindowsTimeInfo gets both boot time and uptime on Windows using systeminfo command
func getWindowsTimeInfo() (SystemInfo, error) {
	lines, err := getWindowsSystemInfo()
	if err != nil {
		return SystemInfo{}, err
	}

	var bootTime, uptime float64
	for _, line := range lines {
		parts := strings.Split(line, ",")
		if len(parts) >= 11 {
			// Get boot time from field 10
			bootTimeStr := strings.Trim(parts[10], "\"")
			// The boot time is in format "HH:MM:SS"
			bootTimeStr = strings.TrimSpace(bootTimeStr)

			// Get today's date to combine with the boot time
			now := time.Now()
			today := now.Format("2006-01-02")

			// Combine today's date with the boot time
			fullTimeStr := fmt.Sprintf("%s %s", today, bootTimeStr)

			bootTimeParsed, err := time.Parse("2006-01-02 15:04:05", fullTimeStr)
			if err != nil {
				return SystemInfo{}, fmt.Errorf("failed to parse boot time: %v", err)
			}

			// If the boot time is in the future (which can happen if the system was booted yesterday),
			// subtract one day
			if bootTimeParsed.After(now) {
				bootTimeParsed = bootTimeParsed.AddDate(0, 0, -1)
			}

			bootTime = float64(bootTimeParsed.Unix())
			uptime = float64(now.Unix()) - bootTime

			return SystemInfo{
				BootTime: bootTime,
				Uptime:   uptime,
			}, nil
		}
	}

	return SystemInfo{}, fmt.Errorf("could not find boot time in systeminfo output")
}

// getDarwinInfo gets both boot time and uptime on macOS using sysctl
func getDarwinInfo() (SystemInfo, error) {
	cmd := exec.Command("sysctl", "-n", "kern.boottime")
	output, err := cmd.Output()
	if err != nil {
		return SystemInfo{}, err
	}

	// Output format: { sec = 1234567890, usec = 123456 }
	parts := strings.Split(string(output), "=")
	if len(parts) != 2 {
		return SystemInfo{}, fmt.Errorf("unexpected sysctl output format")
	}

	secStr := strings.Split(parts[1], ",")[0]
	bootTime, err := strconv.ParseInt(strings.TrimSpace(secStr), 10, 64)
	if err != nil {
		return SystemInfo{}, err
	}

	now := time.Now().Unix()
	uptime := float64(now - bootTime)

	return SystemInfo{
		BootTime: float64(bootTime),
		Uptime:   uptime,
	}, nil
}

// getLinuxInfo gets both boot time and uptime on Linux
func getLinuxInfo() (SystemInfo, error) {
	// Get uptime from /proc/uptime
	cmd := exec.Command("cat", "/proc/uptime")
	output, err := cmd.Output()
	if err != nil {
		return SystemInfo{}, err
	}

	// Output format: "123456.78 123456.78"
	parts := strings.Split(strings.TrimSpace(string(output)), " ")
	if len(parts) == 0 {
		return SystemInfo{}, fmt.Errorf("unexpected /proc/uptime output format")
	}

	uptime, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return SystemInfo{}, err
	}

	// Get boot time from /proc/stat
	cmd = exec.Command("cat", "/proc/stat")
	output, err = cmd.Output()
	if err != nil {
		return SystemInfo{}, err
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "btime ") {
			parts := strings.Split(line, " ")
			if len(parts) == 2 {
				bootTime, err := strconv.ParseInt(parts[1], 10, 64)
				if err != nil {
					return SystemInfo{}, err
				}
				return SystemInfo{
					BootTime: float64(bootTime),
					Uptime:   uptime,
				}, nil
			}
		}
	}

	return SystemInfo{}, fmt.Errorf("could not find boot time in /proc/stat")
}

// getBootTime returns just the boot time
func getBootTime() (float64, error) {
	info, err := getSystemInfo()
	if err != nil {
		return 0, err
	}
	return info.BootTime, nil
}

// getUptime returns just the uptime
func getUptime() (float64, error) {
	info, err := getSystemInfo()
	if err != nil {
		return 0, err
	}
	return info.Uptime, nil
}

// getFQDN returns the fully qualified domain name
func getFQDN() (string, error) {
	switch runtime.GOOS {
	case "windows":
		return getWindowsFQDN()
	case "darwin":
		return getDarwinFQDN()
	case "linux":
		return getLinuxFQDN()
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// getHostname returns the system hostname
func getHostname() (string, error) {
	switch runtime.GOOS {
	case "windows":
		return getWindowsHostname()
	case "darwin":
		return getDarwinHostname()
	case "linux":
		return getLinuxHostname()
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// getWindowsFQDN gets the FQDN on Windows using systeminfo
func getWindowsFQDN() (string, error) {
	lines, err := getWindowsSystemInfo()
	if err != nil {
		return "", err
	}

	var domain string
	for _, line := range lines {
		parts := strings.Split(line, ",")
		if len(parts) >= 29 { // Domain is at index 28
			domain = strings.Trim(parts[28], "\"")
			break
		}
	}

	hostname, err := getWindowsHostname()
	if err != nil {
		return "", err
	}

	// If we have a valid domain (not empty, not WORKGROUP, and not a timezone)
	if domain != "" && domain != "WORKGROUP" && !strings.Contains(domain, " ") {
		return fmt.Sprintf("%s.%s", hostname, domain), nil
	}

	// For local environments, use .local
	return fmt.Sprintf("%s.local", hostname), nil
}

// getDarwinFQDN gets the FQDN on macOS using scutil
func getDarwinFQDN() (string, error) {
	cmd := exec.Command("scutil", "--get", "ComputerName")
	hostname, err := cmd.Output()
	if err != nil {
		return "", err
	}

	cmd = exec.Command("scutil", "--get", "LocalHostName")
	localHostname, err := cmd.Output()
	if err != nil {
		return "", err
	}

	cmd = exec.Command("scutil", "--get", "HostName")
	fullHostname, err := cmd.Output()
	if err != nil {
		return "", err
	}

	// Clean up the output
	hostname = []byte(strings.TrimSpace(string(hostname)))
	localHostname = []byte(strings.TrimSpace(string(localHostname)))
	fullHostname = []byte(strings.TrimSpace(string(fullHostname)))

	// If we have a full hostname, use it
	if len(fullHostname) > 0 {
		return string(fullHostname), nil
	}

	// Otherwise combine computer name and local hostname
	return fmt.Sprintf("%s.%s", hostname, localHostname), nil
}

// getLinuxFQDN gets the FQDN on Linux using hostname command
func getLinuxFQDN() (string, error) {
	cmd := exec.Command("hostname", "-f")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// getWindowsHostname gets the hostname on Windows using hostname command
func getWindowsHostname() (string, error) {
	cmd := exec.Command("hostname")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// getDarwinHostname gets the hostname on macOS using scutil
func getDarwinHostname() (string, error) {
	cmd := exec.Command("scutil", "--get", "ComputerName")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// getLinuxHostname gets the hostname on Linux using hostname command
func getLinuxHostname() (string, error) {
	cmd := exec.Command("hostname", "-s")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// getIPAddress4 returns the IPv4 address
func getIPAddress4() (string, error) {
	var ip string
	var err error

	switch runtime.GOOS {
	case "windows":
		ip, err = getWindowsIPAddress4()
	case "darwin":
		ip, err = getDarwinIPAddress4()
	case "linux":
		ip, err = getLinuxIPAddress4()
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	if err != nil {
		return "", err
	}

	// IPv4 regex pattern: matches four octets between 0-255, separated by dots
	// This will match the first valid IPv4 address in the string
	ipv4Pattern := `(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)`
	re := regexp.MustCompile(ipv4Pattern)
	matches := re.FindString(ip)

	if matches == "" {
		return "", fmt.Errorf("no valid IPv4 address found in: %s", ip)
	}

	return matches, nil
}

// getWindowsIPAddress4 gets the IPv4 address on Windows using ipconfig
func getWindowsIPAddress4() (string, error) {
	lines, err := getWindowsIPConfig()
	if err != nil {
		return "", err
	}

	for _, line := range lines {
		// Look for IPv4 Address line
		if strings.Contains(line, "IPv4 Address") {
			// Format is typically: "   IPv4 Address. . . . . . . . . . . : 192.168.1.1"
			parts := strings.Split(line, ":")
			if len(parts) > 1 {
				ip := strings.TrimSpace(parts[1])
				// Skip localhost
				if ip != "127.0.0.1" {
					// Basic IPv4 validation
					if strings.Count(ip, ".") == 3 {
						return ip, nil
					}
				}
			}
		}
	}
	return "", fmt.Errorf("could not find IPv4 address in ipconfig output")
}

// getDarwinIPAddress4 gets the IPv4 address on macOS using ifconfig
func getDarwinIPAddress4() (string, error) {
	cmd := exec.Command("ifconfig")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "inet ") && !strings.Contains(line, "inet6") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				ip := parts[1]
				// Skip localhost
				if ip != "127.0.0.1" {
					return ip, nil
				}
			}
		}
	}
	return "", fmt.Errorf("could not find IPv4 address")
}

// getLinuxIPAddress4 gets the IPv4 address on Linux using ip command
func getLinuxIPAddress4() (string, error) {
	cmd := exec.Command("ip", "-4", "addr", "show")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "inet ") && !strings.Contains(line, "inet6") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				ip := strings.Split(parts[1], "/")[0]
				// Skip localhost
				if ip != "127.0.0.1" {
					return ip, nil
				}
			}
		}
	}
	return "", fmt.Errorf("could not find IPv4 address")
}

// getMACAddress returns the MAC address
func getMACAddress() (string, error) {
	var mac string
	var err error

	switch runtime.GOOS {
	case "windows":
		mac, err = getWindowsMACAddress()
	case "darwin":
		mac, err = getDarwinMACAddress()
	case "linux":
		mac, err = getLinuxMACAddress()
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}

	if err != nil {
		return "", err
	}

	// MAC address regex pattern: matches 6 groups of 2 hex digits separated by colons
	macPattern := `^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`
	re := regexp.MustCompile(macPattern)
	if !re.MatchString(mac) {
		return "", fmt.Errorf("invalid MAC address format: %s", mac)
	}

	return mac, nil
}

// getWindowsMACAddress gets the MAC address on Windows using ipconfig
func getWindowsMACAddress() (string, error) {
	lines, err := getWindowsIPConfig()
	if err != nil {
		return "", err
	}

	for _, line := range lines {
		if strings.Contains(line, "Physical Address") {
			// Format is typically: "   Physical Address. . . . . . . . . : 00-11-22-33-44-55"
			parts := strings.Split(line, ":")
			if len(parts) > 1 {
				mac := strings.TrimSpace(parts[1])
				// Convert Windows format (dashes) to standard format (colons)
				mac = strings.ReplaceAll(mac, "-", ":")
				return mac, nil
			}
		}
	}
	return "", fmt.Errorf("could not find MAC address in ipconfig output")
}

// getDarwinMACAddress gets the MAC address on macOS using ifconfig
func getDarwinMACAddress() (string, error) {
	cmd := exec.Command("ifconfig")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "ether ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				mac := parts[1]
				return mac, nil
			}
		}
	}
	return "", fmt.Errorf("could not find MAC address")
}

// getLinuxMACAddress gets the MAC address on Linux using ip command
func getLinuxMACAddress() (string, error) {
	cmd := exec.Command("ip", "link", "show")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "link/ether ") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				mac := parts[2]
				return mac, nil
			}
		}
	}
	return "", fmt.Errorf("could not find MAC address")
}

// getPlatformVersion returns the platform version
func getPlatformVersion() (string, error) {
	switch runtime.GOOS {
	case "windows":
		return getWindowsPlatformVersion()
	case "darwin":
		return getDarwinPlatformVersion()
	case "linux":
		return getLinuxPlatformVersion()
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// getWindowsPlatformVersion gets the Windows version using systeminfo
func getWindowsPlatformVersion() (string, error) {
	lines, err := getWindowsSystemInfo()
	if err != nil {
		return "", err
	}

	for _, line := range lines {
		parts := strings.Split(line, ",")
		if len(parts) >= 3 { // OS Version is at index 2
			version := strings.Trim(parts[2], "\"")
			return version, nil
		}
	}
	return "", fmt.Errorf("could not find OS version in systeminfo output")
}

// getDarwinPlatformVersion gets the macOS version using sw_vers
func getDarwinPlatformVersion() (string, error) {
	cmd := exec.Command("sw_vers", "-productVersion")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// getLinuxPlatformVersion gets the Linux version using /etc/os-release
func getLinuxPlatformVersion() (string, error) {
	// Try /etc/os-release first
	cmd := exec.Command("cat", "/etc/os-release")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "VERSION=") {
				// Remove quotes and VERSION= prefix
				version := strings.Trim(strings.TrimPrefix(line, "VERSION="), "\"")
				return version, nil
			}
		}
	}

	// Fallback to lsb_release if available
	cmd = exec.Command("lsb_release", "-r", "-s")
	output, err = cmd.Output()
	if err == nil {
		return strings.TrimSpace(string(output)), nil
	}

	// Last resort: try uname -r
	cmd = exec.Command("uname", "-r")
	output, err = cmd.Output()
	if err != nil {
		return "", fmt.Errorf("could not determine Linux version")
	}
	return strings.TrimSpace(string(output)), nil
}

// getUsers returns information about system users
func getUsers() ([]SystemUser, error) {
	switch runtime.GOOS {
	case "windows":
		return getWindowsUsers()
	case "darwin":
		return getDarwinUsers()
	case "linux":
		return getLinuxUsers()
	default:
		return nil, fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// getWindowsUsers gets user information on Windows
func getWindowsUsers() ([]SystemUser, error) {
	// Get current username using whoami command
	cmd := exec.Command("whoami")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	// Parse username - whoami returns "domain\username" format
	fullUsername := strings.TrimSpace(string(output))
	username := fullUsername
	if strings.Contains(fullUsername, "\\") {
		parts := strings.Split(fullUsername, "\\")
		username = parts[1]
	}

	// Get hostname
	hostname, err := getWindowsHostname()
	if err != nil {
		return nil, err
	}

	// Get explorer.exe PID for this user (a more meaningful PID than 0)
	var pid float64
	cmd = exec.Command("powershell", "-Command", "Get-Process -Name explorer | Select-Object -First 1 -ExpandProperty Id")
	pidOutput, err := cmd.Output()
	if err == nil {
		if pidInt, err := strconv.ParseFloat(strings.TrimSpace(string(pidOutput)), 64); err == nil {
			pid = pidInt
		}
	}

	// Determine session type (console, rdp, etc.)
	terminal := "Console" // Default to Console which is most common

	// Try to determine if RDP session by checking logon ID in registry
	cmd = exec.Command("powershell", "-Command", "Get-ItemProperty 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server\\ClusterSettings' -ErrorAction SilentlyContinue")
	_, err = cmd.Output()
	if err == nil {
		// Terminal Server settings exist, check if RDP is enabled
		cmd = exec.Command("powershell", "-Command", "(Get-ItemProperty 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -ErrorAction SilentlyContinue).fDenyTSConnections")
		rdpOutput, err := cmd.Output()
		if err == nil {
			value := strings.TrimSpace(string(rdpOutput))
			if value == "0" {
				// RDP is enabled, check if current session is RDP
				cmd = exec.Command("powershell", "-Command", "Get-WmiObject -Class Win32_ComputerSystem | Select-Object -ExpandProperty UserName")
				userOutput, err := cmd.Output()
				if err == nil {
					currentUser := strings.TrimSpace(string(userOutput))
					if strings.Contains(strings.ToLower(currentUser), "rdp") {
						terminal = "RDP"
					}
				}
			}
		}
	}

	// Create user object for current user
	user := SystemUser{
		Name:     username,
		Active:   true,
		Terminal: terminal,
		Host:     hostname,
		Started:  float64(time.Now().Unix()),
		PID:      pid,
	}

	return []SystemUser{user}, nil
}

// getDarwinUsers gets user information on macOS using who
func getDarwinUsers() ([]SystemUser, error) {
	cmd := exec.Command("who")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var users []SystemUser
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// who output format: username terminal login_time host
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}

		username := fields[0]
		terminal := fields[1]
		host := fields[3]

		// Get process ID for the terminal
		pidCmd := exec.Command("ps", "-o", "pid=", "-t", terminal)
		pidOutput, err := pidCmd.Output()
		if err != nil {
			continue
		}
		pid, err := strconv.ParseFloat(strings.TrimSpace(string(pidOutput)), 64)
		if err != nil {
			continue
		}

		// Get start time
		startCmd := exec.Command("ps", "-o", "lstart=", "-p", fmt.Sprintf("%.0f", pid))
		startOutput, err := startCmd.Output()
		if err != nil {
			continue
		}
		startTime, err := time.Parse("Mon Jan 02 15:04:05 2006", strings.TrimSpace(string(startOutput)))
		if err != nil {
			continue
		}

		user := SystemUser{
			Name:     username,
			Active:   true, // If they're in who output, they're active
			Terminal: terminal,
			Host:     host,
			Started:  float64(startTime.Unix()),
			PID:      pid,
		}
		users = append(users, user)
	}

	return users, nil
}

// getLinuxUsers gets user information on Linux using who
func getLinuxUsers() ([]SystemUser, error) {
	cmd := exec.Command("who")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var users []SystemUser
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// who output format: username terminal login_time host
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}

		username := fields[0]
		terminal := fields[1]
		host := fields[3]

		// Get process ID for the terminal
		pidCmd := exec.Command("ps", "-o", "pid=", "-t", terminal)
		pidOutput, err := pidCmd.Output()
		if err != nil {
			continue
		}
		pid, err := strconv.ParseFloat(strings.TrimSpace(string(pidOutput)), 64)
		if err != nil {
			continue
		}

		// Get start time
		startCmd := exec.Command("ps", "-o", "lstart=", "-p", fmt.Sprintf("%.0f", pid))
		startOutput, err := startCmd.Output()
		if err != nil {
			continue
		}
		startTime, err := time.Parse("Mon Jan 02 15:04:05 2006", strings.TrimSpace(string(startOutput)))
		if err != nil {
			continue
		}

		user := SystemUser{
			Name:     username,
			Active:   true, // If they're in who output, they're active
			Terminal: terminal,
			Host:     host,
			Started:  float64(startTime.Unix()),
			PID:      pid,
		}
		users = append(users, user)
	}

	return users, nil
}
