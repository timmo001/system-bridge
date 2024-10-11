package modules

import (
	"context"

	"github.com/elastic/go-sysinfo"
	"github.com/timmo001/system-bridge/assert"
	"github.com/timmo001/system-bridge/version"
)

func (m *Modules) UpdateSystem() {
	host, err := sysinfo.Host()
	assert.Nil(err, "Failed to get host information")

	info := host.Info()

	fqdn, err := host.FQDNWithContext(context.Background())
	assert.Nil(err, "Failed to get host fqdn")

	// Update module
	m.System = System{
		Architecture:       info.Architecture,
		BootTime:           info.BootTime,
		Containerized:      info.Containerized,
		FQDN:               fqdn,
		Hostname:           info.Hostname,
		IPs:                info.IPs,
		KernelVersion:      info.KernelVersion,
		MACs:               info.MACs,
		NativeArchitecture: info.NativeArchitecture,
		OS: &OS{
			Build:    info.OS.Build,
			Codename: info.OS.Codename,
			Family:   info.OS.Family,
			Major:    info.OS.Major,
			Minor:    info.OS.Minor,
			Name:     info.OS.Name,
			Patch:    info.OS.Patch,
			Platform: info.OS.Platform,
			Type:     info.OS.Type,
			Version:  info.OS.Version,
		},
		Timezone:          info.Timezone,
		TimezoneOffsetSec: info.TimezoneOffsetSec,
		UniqueID:          info.UniqueID,
		Uptime:            int(info.Uptime().Seconds()),
		Version:           version.GetVersion(),
	}
}
