package modules

import "time"

type OS struct {
	Build    string `json:"build,omitempty"`    // Build (e.g. 16G1114).
	Codename string `json:"codename,omitempty"` // OS codename (e.g. jessie).
	Family   string `json:"family"`             // OS Family (e.g. redhat, debian, freebsd, windows).
	Major    int    `json:"major"`              // Major release version.
	Minor    int    `json:"minor"`              // Minor release version.
	Name     string `json:"name"`               // OS Name (e.g. Mac OS X, CentOS).
	Patch    int    `json:"patch"`              // Patch release version.
	Platform string `json:"platform"`           // OS platform (e.g. centos, ubuntu, windows).
	Type     string `json:"type"`               // OS Type (one of linux, macos, unix, windows).
	Version  string `json:"version"`            // OS version (e.g. 10.12.6).
}

type System struct {
	Architecture       string    `json:"architecture"`            // Process hardware architecture (e.g. x86_64, arm, ppc, mips).
	BootTime           time.Time `json:"boot_time"`               // Host boot time.
	Containerized      *bool     `json:"containerized,omitempty"` // Is the process containerized.
	FQDN               string    `json:"fqdn"`                    // Fully qualified domain name.
	Hostname           string    `json:"name"`                    // Hostname.
	IPs                []string  `json:"ip,omitempty"`            // List of all IPs.
	KernelVersion      string    `json:"kernel_version"`          // Kernel version.
	MACs               []string  `json:"mac"`                     // List of MAC addresses.
	NativeArchitecture string    `json:"native_architecture"`     // Native OS hardware architecture (e.g. x86_64, arm, ppc, mips).
	OS                 *OS       `json:"os"`                      // OS information.
	Timezone           string    `json:"timezone"`                // System timezone.
	TimezoneOffsetSec  int       `json:"timezone_offset_sec"`     // Timezone offset (seconds from UTC).
	UniqueID           string    `json:"id,omitempty"`            // Unique ID of the host (optional).
	Uptime             int       `json:"uptime"`                  // Host uptime (seconds). Time since boot time.
	Version            string    `json:"version"`                 // System Bridge version.
}

type Modules struct {
	System System
}

func NewModules() *Modules {
	return &Modules{}
}
