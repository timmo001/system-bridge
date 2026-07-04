//go:build !linux

package system

import "github.com/timmo001/system-bridge/types"

func GetCameraUsage() []string {
	return nil
}

func GetMicrophoneUsage() []string {
	return nil
}

func GetPendingReboot() *bool {
	return nil
}

func GetPSUPowerUsage() *float64 {
	return nil
}

func GetDeviceInfo() *types.DeviceInfo {
	return nil
}
