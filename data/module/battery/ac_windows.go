//go:build windows

package battery

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	modKernel32              = windows.NewLazySystemDLL("kernel32.dll")
	procGetSystemPowerStatus = modKernel32.NewProc("GetSystemPowerStatus")
)

// systemPowerStatus is SYSTEM_POWER_STATUS
type systemPowerStatus struct {
	ACLineStatus        byte
	BatteryFlag         byte
	BatteryLifePercent  byte
	SystemStatusFlag    byte
	BatteryLifeTime     uint32
	BatteryFullLifeTime uint32
}

func acConnected() *bool {
	var status systemPowerStatus
	if ret, _, _ := procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&status))); ret == 0 {
		return nil
	}
	// 0 is offline, 1 is online and 255 is unknown
	if status.ACLineStatus > 1 {
		return nil
	}
	connected := status.ACLineStatus == 1
	return &connected
}
