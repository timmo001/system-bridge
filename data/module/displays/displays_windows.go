//go:build windows

package displays

import (
	"fmt"
	"regexp"
	"sync"
	"syscall"
	"unsafe"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

var (
	user32              = syscall.NewLazyDLL("user32.dll")
	enumDisplayMonitors = user32.NewProc("EnumDisplayMonitors")
	getMonitorInfo      = user32.NewProc("GetMonitorInfoW")
	displayPathRegex    = regexp.MustCompile(`^\\\\.\\|^\\\\\?\\`)
	displayNameRegex    = regexp.MustCompile(`^DISPLAY(\d+)$`)
)

type RECT struct {
	Left, Top, Right, Bottom int32
}

type MONITORINFOEX struct {
	CbSize     uint32
	Monitor    RECT
	WorkArea   RECT
	Flags      uint32
	DeviceName [32]uint16
}

func formatDisplayName(id string) string {
	matches := displayNameRegex.FindStringSubmatch(id)
	if len(matches) == 2 {
		return fmt.Sprintf("Display %s", matches[1])
	}
	return id
}

// enumState carries the result of one EnumDisplayMonitors pass. The callback
// is created once because syscall.NewCallback never frees a callback and
// Windows allows only a limited number per process; creating one per update
// leaked them and would eventually panic.
var (
	enumMu       sync.Mutex
	enumDisplays []types.Display
	enumCallback = syscall.NewCallback(func(handle syscall.Handle, dc syscall.Handle, rect *RECT, data uintptr) uintptr {
		var info MONITORINFOEX
		info.CbSize = uint32(unsafe.Sizeof(info))

		ret, _, _ := getMonitorInfo.Call(
			uintptr(handle),
			uintptr(unsafe.Pointer(&info)),
		)

		if ret == 0 {
			return 1
		}

		width := info.Monitor.Right - info.Monitor.Left
		height := info.Monitor.Bottom - info.Monitor.Top
		isPrimary := (info.Flags & 0x1) != 0 // MONITORINFOF_PRIMARY
		pixelClock := 0.0
		refreshRate := 0.0

		displayName := syscall.UTF16ToString(info.DeviceName[:])
		cleanID := displayPathRegex.ReplaceAllString(displayName, "")
		display := types.Display{
			ID:                   cleanID,
			Name:                 formatDisplayName(cleanID),
			ResolutionHorizontal: int(width),
			ResolutionVertical:   int(height),
			X:                    int(info.Monitor.Left),
			Y:                    int(info.Monitor.Top),
			IsPrimary:            &isPrimary,
			PixelClock:           &pixelClock,
			RefreshRate:          &refreshRate,
		}

		enumDisplays = append(enumDisplays, display)
		return 1
	})
)

func GetDisplays() ([]types.Display, error) {
	// EnumDisplayMonitors calls back synchronously, so the shared result
	// slice is only touched while this lock is held.
	enumMu.Lock()
	defer enumMu.Unlock()
	enumDisplays = nil

	ret, _, err := enumDisplayMonitors.Call(0, 0, enumCallback, 0)
	if ret == 0 {
		return nil, fmt.Errorf("EnumDisplayMonitors failed: %v", err)
	}

	displays := enumDisplays
	enumDisplays = nil

	if len(displays) == 0 {
		slog.Info("No displays found")
		return displays, nil
	}

	return displays, nil
}
