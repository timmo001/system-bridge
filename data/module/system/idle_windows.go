//go:build windows

package system

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	modUser32                      = windows.NewLazySystemDLL("user32.dll")
	procGetLastInputInfo           = modUser32.NewProc("GetLastInputInfo")
	modKernel32                    = windows.NewLazySystemDLL("kernel32.dll")
	procGetTickCount               = modKernel32.NewProc("GetTickCount")
	modWtsapi32                    = windows.NewLazySystemDLL("wtsapi32.dll")
	procWTSQuerySessionInformation = modWtsapi32.NewProc("WTSQuerySessionInformationW")
	procWTSFreeMemory              = modWtsapi32.NewProc("WTSFreeMemory")
)

const (
	wtsCurrentSession     = 0xFFFFFFFF
	wtsSessionInfoEx      = 25
	wtsSessionStateLock   = 0
	wtsSessionStateUnlock = 1
)

// lastInputInfo is LASTINPUTINFO
type lastInputInfo struct {
	cbSize uint32
	dwTime uint32
}

// wtsInfoEx is WTSINFOEXW up to the level 1 session flags
type wtsInfoEx struct {
	Level        uint32
	SessionID    uint32
	SessionState int32
	SessionFlags int32
}

// GetIdleState returns the seconds since the user's last input and whether
// their session is locked
func GetIdleState() (*uint64, *bool) {
	return idleTime(), sessionLocked()
}

func idleTime() *uint64 {
	info := lastInputInfo{cbSize: uint32(unsafe.Sizeof(lastInputInfo{}))}
	if ret, _, _ := procGetLastInputInfo.Call(uintptr(unsafe.Pointer(&info))); ret == 0 {
		return nil
	}
	// Both are 32 bit tick counts, so the subtraction wraps correctly
	now, _, _ := procGetTickCount.Call()
	seconds := uint64(uint32(now)-info.dwTime) / 1000
	return &seconds
}

func sessionLocked() *bool {
	var info *wtsInfoEx
	var size uint32
	ret, _, _ := procWTSQuerySessionInformation.Call(
		0, // WTS_CURRENT_SERVER_HANDLE
		wtsCurrentSession,
		wtsSessionInfoEx,
		uintptr(unsafe.Pointer(&info)),
		uintptr(unsafe.Pointer(&size)),
	)
	if ret == 0 || info == nil {
		return nil
	}
	defer func() { _, _, _ = procWTSFreeMemory.Call(uintptr(unsafe.Pointer(info))) }()

	if size < uint32(unsafe.Sizeof(wtsInfoEx{})) {
		return nil
	}
	var locked bool
	switch info.SessionFlags {
	case wtsSessionStateLock:
		locked = true
	case wtsSessionStateUnlock:
		locked = false
	default:
		return nil
	}
	return &locked
}
