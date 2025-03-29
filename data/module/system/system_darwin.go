//go:build darwin

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

func getFQDN() (string, error) {
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

func getLinuxFQDN() (string, error) {
	cmd := exec.Command("hostname", "--fqdn")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get FQDN: %v", err)
	}
	return strings.TrimSpace(string(output)), nil
}

func getHostname() (string, error) {
	cmd := exec.Command("scutil", "--get", "ComputerName")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}
func getIPAddress4() (string, error) {
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

func getMACAddress() (string, error) {
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

func getPlatformVersion() (string, error) {
	cmd := exec.Command("sw_vers", "-productVersion")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func getUsers() ([]types.SystemUser, error) {
	cmd := exec.Command("who")
	output, err := cmd.Output()
	if err != nil {
		return []types.SystemUser{}, err
	}

	var users []types.SystemUser
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
	cmd := exec.Command("ioreg", "-rd1", "-c", "IOPlatformExpertDevice")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "IOPlatformUUID") {
			parts := strings.Split(line, "\"")
			if len(parts) >= 3 {
				return strings.TrimSpace(parts[3]), nil
			}
		}
	}

	// Fallback to hardware UUID
	cmd = exec.Command("system_profiler", "SPHardwareDataType")
	output, err = cmd.Output()
	if err != nil {
		return "", err
	}

	lines = strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "Hardware UUID") {
			parts := strings.Split(line, ":")
			if len(parts) >= 2 {
				return strings.TrimSpace(parts[1]), nil
			}
		}
	}

	return "", fmt.Errorf("could not find UUID on macOS")
}
