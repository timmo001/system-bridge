//go:build !linux && !windows

package networks

import "github.com/timmo001/system-bridge/types"

// wifiInterfaces isn't supported on this platform, so Wi-Fi details are null
func wifiInterfaces() map[string]*types.NetworkWifi {
	return nil
}
