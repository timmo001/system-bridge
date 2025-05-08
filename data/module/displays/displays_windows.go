//go:build windows
// +build windows

package displays

import (
	"fmt"
	"regexp"
	"syscall"
	"unsafe"

	"github.com/charmbracelet/log"
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

func GetDisplays() ([]types.Display, error) {
	var displays []types.Display

	callback := syscall.NewCallback(func(handle syscall.Handle, dc syscall.Handle, rect *RECT, data uintptr) uintptr {
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

		displays = append(displays, display)
		return 1
	})

	ret, _, err := enumDisplayMonitors.Call(0, 0, callback, 0)
	if ret == 0 {
		return nil, fmt.Errorf("EnumDisplayMonitors failed: %v", err)
	}

	if len(displays) == 0 {
		log.Warn("No displays found")
		return displays, nil
	}

	return displays, nil
}
