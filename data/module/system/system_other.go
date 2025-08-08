//go:build !linux
// +build !linux

package system

func GetCameraUsage() []string {
	return nil
}

func GetPendingReboot() *bool {
	return nil
}
