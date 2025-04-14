//go:build windows

package system

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/types"
)

var windowsSystemInfoCache struct {
	lines []string
	err   error
}

var windowsIPConfigCache struct {
	lines []string
	err   error
}

func getRawSystemInfo() ([]string, error) {
	// Return cached result if available
	if windowsSystemInfoCache.lines != nil || windowsSystemInfoCache.err != nil {
		return windowsSystemInfoCache.lines, windowsSystemInfoCache.err
	}

	cmd := exec.Command("systeminfo", "/fo", "csv", "/nh")
	output, err := cmd.Output()
	if err != nil {
		windowsSystemInfoCache.err = err
		return []string{}, err
	}
	windowsSystemInfoCache.lines = strings.Split(string(output), "\r\n")
	return windowsSystemInfoCache.lines, nil
}

func getIPConfig() ([]string, error) {
	// Return cached result if available
	if windowsIPConfigCache.lines != nil || windowsIPConfigCache.err != nil {
		return windowsIPConfigCache.lines, windowsIPConfigCache.err
	}

	cmd := exec.Command("ipconfig", "/all")
	output, err := cmd.Output()
	if err != nil {
		windowsIPConfigCache.err = err
		return []string{}, err
	}
	windowsIPConfigCache.lines = strings.Split(string(output), "\r\n")
	return windowsIPConfigCache.lines, nil
}

func getSystemInfo() (SystemInfo, error) {
	lines, err := getRawSystemInfo()
	if err != nil {
		return SystemInfo{}, err
	}

	var bootTime, uptime float64
	formats := []string{
		"2006-01-02 15:04:05",   // 24-hour format
		"2006-01-02 3:04:05 PM", // 12-hour format with AM/PM
	}

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

			var bootTimeParsed time.Time                                                   
			var parseError error                                                           
			parsed := false                                                                
			for _, format := range formats {                                               
				if t, err := time.Parse(format, fullTimeStr); err == nil {                   
					bootTimeParsed = t                                                         
					parsed = true                                                              
				} else {                                                                     
					parseError = err                                                           
				}                                                                            
			}                                                                              
                                                                                    
			if !parsed {                                                                   
				return SystemInfo{}, fmt.Errorf("failed to parse boot time: %v", parseError) 
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

func getFQDN() (string, error) {
	lines, err := getRawSystemInfo()
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

	hostname, err := getHostname()
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

func getHostname() (string, error) {
	cmd := exec.Command("hostname")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func getIPAddress4() (string, error) {
	lines, err := getIPConfig()
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

func getMACAddress() (string, error) {
	lines, err := getIPConfig()
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

func getPlatformVersion() (string, error) {
	lines, err := getRawSystemInfo()
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

func getUsers() ([]types.SystemUser, error) {
	// Get current username using whoami command
	cmd := exec.Command("whoami")
	output, err := cmd.Output()
	if err != nil {
		return make([]types.SystemUser, 0), err
	}

	// Parse username - whoami returns "domain\username" format
	fullUsername := strings.TrimSpace(string(output))
	username := fullUsername
	if strings.Contains(fullUsername, "\\") {
		parts := strings.Split(fullUsername, "\\")
		username = parts[1]
	}

	// Get hostname
	hostname, err := getHostname()
	if err != nil {
		return make([]types.SystemUser, 0), err
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
	user := types.SystemUser{
		Name:     username,
		Active:   true,
		Terminal: terminal,
		Host:     hostname,
		Started:  float64(time.Now().Unix()),
		PID:      pid,
	}

	return []types.SystemUser{user}, nil
}

func getUUID() (string, error) {
	// Try PowerShell with CIM first
	cmd := exec.Command("powershell", "-Command", "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID")
	output, err := cmd.Output()
	if err == nil {
		uuid := strings.TrimSpace(string(output))
		if uuid != "" && uuid != "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" {
			return uuid, nil
		}
	}

	// Try registry MachineGuid as fallback
	cmd = exec.Command("powershell", "-Command", "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid")
	output, err = cmd.Output()
	if err == nil {
		uuid := strings.TrimSpace(string(output))
		if uuid != "" {
			return uuid, nil
		}
	}

	// Try disk serial as last resort
	cmd = exec.Command("powershell", "-Command", "Get-PhysicalDisk | Select-Object -First 1 -ExpandProperty SerialNumber")
	output, err = cmd.Output()
	if err == nil {
		uuid := strings.TrimSpace(string(output))
		if uuid != "" {
			return uuid, nil
		}
	}

	return "", fmt.Errorf("could not find UUID on Windows")
}
