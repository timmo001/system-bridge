//go:build linux

package system

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/types"
)

func getSystemInfo() (SystemInfo, error) {
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

func getFQDN() (string, error) {
	cmd := exec.Command("hostname", "--fqdn")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func getHostname() (string, error) {
	cmd := exec.Command("hostname", "--short")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func getIPAddress4() (string, error) {
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

func getMACAddress() (string, error) {
	cmd := exec.Command("ip", "link", "show")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(output), "\n")
	var bestMAC string
	var isPhysicalInterface bool

	for _, line := range lines {
		// Check if this is an interface definition line
		if strings.Contains(line, ": ") {
			isPhysicalInterface = strings.Contains(line, "enp") ||
				strings.Contains(line, "eth") ||
				strings.Contains(line, "wlp") ||
				strings.Contains(line, "wlan")
			continue
		}

		// Process MAC address line
		if strings.Contains(line, "link/ether ") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				mac := parts[1]
				// Skip broadcast addresses and null MACs
				if mac == "brd" || mac == "00:00:00:00:00:00" {
					continue
				}
				// Verify MAC format
				if !macAddressPattern.MatchString(mac) {
					continue
				}

				// Return immediately if this is a physical interface
				if isPhysicalInterface {
					return mac, nil
				}

				// Store the first valid MAC as fallback
				if bestMAC == "" {
					bestMAC = mac
				}
			}
		}
	}

	if bestMAC != "" {
		return bestMAC, nil
	}
	return "", fmt.Errorf("could not find valid MAC address")
}

func getUsers() ([]types.SystemUser, error) {
	cmd := exec.Command("who")
	output, err := cmd.Output()
	if err != nil {
		return make([]types.SystemUser, 0), err
	}

	users := make([]types.SystemUser, 0)
	lines := strings.SplitSeq(string(output), "\n")
	for line := range lines {
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

		user := types.SystemUser{
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

func getUUID() (string, error) {
	// Try product_uuid from DMI
	cmd := exec.Command("cat", "/sys/class/dmi/id/product_uuid")
	output, err := cmd.Output()
	if err == nil {
		uuid := strings.TrimSpace(string(output))
		if uuid != "" && uuid != "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" {
			return uuid, nil
		}
	}

	// Try dmidecode (requires root privileges)
	cmd = exec.Command("sudo", "dmidecode", "-s", "system-uuid")
	output, err = cmd.Output()
	if err == nil {
		uuid := strings.TrimSpace(string(output))
		if uuid != "" && uuid != "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" {
			return uuid, nil
		}
	}

	// Fallback to machine-id
	cmd = exec.Command("cat", "/etc/machine-id")
	output, err = cmd.Output()
	if err == nil {
		uuid := strings.TrimSpace(string(output))
		if uuid != "" {
			return uuid, nil
		}
	}

	return "", fmt.Errorf("could not find UUID on Linux")
}

func getPlatformVersion() (string, error) {
	// Try lsb_release first
	cmd := exec.Command("lsb_release", "-r", "-s")
	output, err := cmd.Output()
	if err == nil {
		return strings.TrimSpace(string(output)), nil
	}

	// Fallback to /etc/os-release
	cmd = exec.Command("cat", "/etc/os-release")
	output, err = cmd.Output()
	if err == nil {
		lines := strings.SplitSeq(string(output), "\n")
		for line := range lines {
			if strings.HasPrefix(line, "VERSION=") {
				// Remove quotes and VERSION= prefix
				version := strings.Trim(strings.TrimPrefix(line, "VERSION="), "\"")
				return version, nil
			}
		}
	}

	// Last resort: try uname -r
	cmd = exec.Command("uname", "-r")
	output, err = cmd.Output()
	if err != nil {
		return "", fmt.Errorf("could not determine Linux version")
	}
	return strings.TrimSpace(string(output)), nil
}
