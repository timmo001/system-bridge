package data_module

import (
	"fmt"
	"os/exec"
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

	for _, line := range lines {
		parts := strings.Split(line, ",")
		if len(parts) >= 29 { // Domain is at index 28
			domain := strings.Trim(parts[28], "\"")
			hostname, err := getWindowsHostname()
			if err != nil {
				return "", err
			}
			if domain != "" {
				return fmt.Sprintf("%s.%s", hostname, domain), nil
			}
			return hostname, nil
		}
	}
	return "", fmt.Errorf("could not find domain in systeminfo output")
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
	switch runtime.GOOS {
	case "windows":
		return getWindowsIPAddress4()
	case "darwin":
		return getDarwinIPAddress4()
	case "linux":
		return getLinuxIPAddress4()
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// getWindowsIPAddress4 gets the IPv4 address on Windows using systeminfo
func getWindowsIPAddress4() (string, error) {
	lines, err := getWindowsSystemInfo()
	if err != nil {
		return "", err
	}

	for _, line := range lines {
		parts := strings.Split(line, ",")
		if len(parts) >= 31 { // Network Card(s) is at index 30
			// The network card info is in format: "Name: Ethernet, IP: 192.168.1.1"
			cardInfo := strings.Trim(parts[30], "\"")
			// Look for IPv4 address in the format "IP: xxx.xxx.xxx.xxx"
			if strings.Contains(cardInfo, "IP:") {
				ipParts := strings.Split(cardInfo, "IP:")
				if len(ipParts) > 1 {
					// Get the first IP address (IPv4)
					ip := strings.Split(ipParts[1], ",")[0]
					ip = strings.TrimSpace(ip)
					// Basic IPv4 validation
					if strings.Count(ip, ".") == 3 {
						return ip, nil
					}
				}
			}
		}
	}
	return "", fmt.Errorf("could not find IPv4 address in systeminfo output")
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
	switch runtime.GOOS {
	case "windows":
		return getWindowsMACAddress()
	case "darwin":
		return getDarwinMACAddress()
	case "linux":
		return getLinuxMACAddress()
	default:
		return "", fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

// getWindowsMACAddress gets the MAC address on Windows using systeminfo
func getWindowsMACAddress() (string, error) {
	lines, err := getWindowsSystemInfo()
	if err != nil {
		return "", err
	}

	for _, line := range lines {
		parts := strings.Split(line, ",")
		if len(parts) >= 31 { // Network Card(s) is at index 30
			// The network card info is in format: "Name: Ethernet, MAC: 00:11:22:33:44:55"
			cardInfo := strings.Trim(parts[30], "\"")
			// Look for MAC address in the format "MAC: xx:xx:xx:xx:xx:xx"
			if strings.Contains(cardInfo, "MAC:") {
				macParts := strings.Split(cardInfo, "MAC:")
				if len(macParts) > 1 {
					// Get the first MAC address
					mac := strings.Split(macParts[1], ",")[0]
					mac = strings.TrimSpace(mac)
					// Basic MAC validation (6 groups of 2 hex digits)
					if strings.Count(mac, ":") == 5 {
						return mac, nil
					}
				}
			}
		}
	}
	return "", fmt.Errorf("could not find MAC address in systeminfo output")
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
				// Basic MAC validation (6 groups of 2 hex digits)
				if strings.Count(mac, ":") == 5 {
					return mac, nil
				}
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
				// Basic MAC validation (6 groups of 2 hex digits)
				if strings.Count(mac, ":") == 5 {
					return mac, nil
				}
			}
		}
	}
	return "", fmt.Errorf("could not find MAC address")
}
