//go:build linux

package networks

import (
	"log/slog"

	"github.com/mdlayher/wifi"

	"github.com/timmo001/system-bridge/types"
)

// wifiInterfaces reads each wireless interface's connection from nl80211,
// keyed by interface name. It returns nil where nl80211 isn't available, such
// as on systems without wireless drivers.
func wifiInterfaces() map[string]*types.NetworkWifi {
	client, err := wifi.New()
	if err != nil {
		slog.Debug("nl80211 not available", "error", err)
		return nil
	}
	defer func() {
		if err := client.Close(); err != nil {
			slog.Debug("Error closing nl80211 client", "error", err)
		}
	}()

	ifaces, err := client.Interfaces()
	if err != nil {
		slog.Debug("Error listing wireless interfaces", "error", err)
		return nil
	}

	result := make(map[string]*types.NetworkWifi, len(ifaces))
	for _, ifi := range ifaces {
		// Interfaces without a netdev, such as P2P devices, have no name
		if ifi.Name == "" || ifi.Type != wifi.InterfaceTypeStation {
			continue
		}
		info := &types.NetworkWifi{}
		result[ifi.Name] = info

		// BSS fails with a not-exist error while the interface isn't connected
		bss, err := client.BSS(ifi)
		if err != nil || bss.Status != wifi.BSSStatusAssociated {
			continue
		}
		ssid := bss.SSID
		info.SSID = &ssid

		stations, err := client.StationInfo(ifi)
		if err != nil || len(stations) == 0 {
			continue
		}
		station := stations[0]
		signal := station.Signal
		if station.SignalAverage != 0 {
			signal = station.SignalAverage
		}
		if signal != 0 {
			// The linear dBm to quality mapping Windows uses: -100 dBm or
			// weaker is 0%, -50 dBm or stronger is 100%
			percent := min(max(2*(signal+100), 0), 100)
			info.Signal = &signal
			info.SignalPercent = &percent
		}
		if station.TransmitBitrate > 0 {
			rate := float64(station.TransmitBitrate) / 1_000_000
			info.LinkRate = &rate
		}
	}
	return result
}
