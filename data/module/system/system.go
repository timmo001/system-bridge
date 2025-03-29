package system

import (
	"fmt"
	"regexp"

	"github.com/timmo001/system-bridge/types"
)

// MAC address regex pattern: matches 6 groups of 2 hex digits separated by colons or hyphens
var macAddressPattern = regexp.MustCompile(`^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`)

// SystemInfo contains boot time and uptime information
type SystemInfo struct {
	BootTime float64
	Uptime   float64
}

// GetBootTime returns just the boot time
func GetBootTime() (float64, error) {
	info, err := getSystemInfo()
	if err != nil {
		return 0, err
	}
	return info.BootTime, nil
}

// GetUptime returns just the uptime
func GetUptime() (float64, error) {
	info, err := getSystemInfo()
	if err != nil {
		return 0, err
	}
	return info.Uptime, nil
}

// GetFQDN returns the fully qualified domain name
func GetFQDN() (string, error) {
	return getFQDN()
}

// GetHostname returns the system hostname
func GetHostname() (string, error) {
	return getHostname()
}

// GetIPAddress4 returns the IPv4 address
func GetIPAddress4() (string, error) {
	ip, err := getIPAddress4()
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

// GetMACAddress returns the MAC address
func GetMACAddress() (string, error) {
	mac, err := getMACAddress()
	if err != nil {
		return "", err
	}

	// MAC address regex pattern: matches 6 groups of 2 hex digits separated by colons or hyphens
	macPattern := `^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`
	re := regexp.MustCompile(macPattern)
	if !re.MatchString(mac) {
		return "", fmt.Errorf("invalid MAC address format: %s", mac)
	}

	return mac, nil
}
// GetPlatformVersion returns the platform version
func GetPlatformVersion() (string, error) {
	return getPlatformVersion()
}

// GetUsers returns information about system users
func GetUsers() ([]types.SystemUser, error) {
	return getUsers()
}

// GetUUID returns a unique identifier for the system
func GetUUID() (string, error) {
	return getUUID()
}

