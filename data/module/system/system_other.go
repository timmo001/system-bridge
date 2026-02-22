//go:build !linux

package system

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
