//go:build windows

package desktop

import (
	"cmp"
	"context"
	"fmt"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/watch"
	"golang.org/x/sys/windows"
)

// watchInterval is how often to check the windows, which Windows can't report
// changes to without a hook
const watchInterval = time.Second

const (
	gwOwner                     = 4
	gwlExStyle                  = -20
	wsExToolWindow              = 0x00000080
	monitorDefaultToNearest     = 2
	localeSLocalizedDisplayName = 0x00000002
	localeNameMaxLength         = 85
)

var (
	modUser32                 = windows.NewLazySystemDLL("user32.dll")
	procGetKeyboardLayoutList = modUser32.NewProc("GetKeyboardLayoutList")
	procGetMonitorInfoW       = modUser32.NewProc("GetMonitorInfoW")
	procGetWindow             = modUser32.NewProc("GetWindow")
	procGetWindowLongPtrW     = modUser32.NewProc("GetWindowLongPtrW")
	procGetWindowRect         = modUser32.NewProc("GetWindowRect")
	procGetWindowTextLengthW  = modUser32.NewProc("GetWindowTextLengthW")
	procGetWindowTextW        = modUser32.NewProc("GetWindowTextW")
	procIsIconic              = modUser32.NewProc("IsIconic")
	procIsZoomed              = modUser32.NewProc("IsZoomed")
	procMonitorFromWindow     = modUser32.NewProc("MonitorFromWindow")

	modKernel32          = windows.NewLazySystemDLL("kernel32.dll")
	procGetLocaleInfoEx  = modKernel32.NewProc("GetLocaleInfoEx")
	procLCIDToLocaleName = modKernel32.NewProc("LCIDToLocaleName")
)

type rect struct {
	Left, Top, Right, Bottom int32
}

type monitorInfoEx struct {
	CbSize     uint32
	Monitor    rect
	WorkArea   rect
	Flags      uint32
	DeviceName [32]uint16
}

// The callback is created once, as syscall.NewCallback never frees one and
// Windows allows only a limited number per process
var (
	enumMu       sync.Mutex
	enumWindows  []windows.HWND
	enumCallback = syscall.NewCallback(func(hwnd windows.HWND, _ uintptr) uintptr {
		enumWindows = append(enumWindows, hwnd)
		return 1
	})
)

// windowTitles is the window titles setting as of the last Get, so the watch
// doesn't load the settings every second
var windowTitles atomic.Bool

// Get reports the desktop's windows and keyboard layout
func Get(context.Context) (*types.DesktopData, error) {
	titles := windowTitlesEnabled()
	windowTitles.Store(titles)
	data := read(titles)
	return &data, nil
}

// Watch calls changed whenever the windows or keyboard layout change, until
// ctx is done
func Watch(ctx context.Context, changed func()) {
	watch.Poll(ctx, watchInterval, func() (types.DesktopData, error) {
		return read(windowTitles.Load()), nil
	}, changed)
}

func read(titles bool) types.DesktopData {
	foreground := windows.GetForegroundWindow()
	data := types.DesktopData{
		Compositor: types.DesktopCompositorWindows,
		Keyboard:   keyboard(foreground),
		Windows:    []types.DesktopWindow{},
		Workspaces: []types.DesktopWorkspace{},
	}

	for _, hwnd := range topLevelWindows() {
		title := windowText(hwnd)
		if title == "" {
			continue
		}
		id := fmt.Sprintf("0x%x", uintptr(hwnd))
		focused := hwnd == foreground
		if focused {
			data.FocusedWindow = pointer(id)
		}

		window := types.DesktopWindow{
			ID:        id,
			Display:   windowDisplay(hwnd),
			Focused:   focused,
			Maximised: pointer(callBool(procIsZoomed, hwnd)),
			Minimised: pointer(callBool(procIsIconic, hwnd)),
		}
		if titles {
			window.Title = pointer(title)
		}
		var pid uint32
		if _, err := windows.GetWindowThreadProcessId(hwnd, &pid); err == nil && pid != 0 {
			window.PID = pointer(int(pid))
			window.App = nonEmpty(executableName(pid))
		}
		var bounds rect
		if ret, _, _ := procGetWindowRect.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&bounds))); ret != 0 {
			window.X = pointer(int(bounds.Left))
			window.Y = pointer(int(bounds.Top))
			window.Width = pointer(int(bounds.Right - bounds.Left))
			window.Height = pointer(int(bounds.Bottom - bounds.Top))
		}
		data.Windows = append(data.Windows, window)
	}
	// EnumWindows lists them front to back, which shifts as focus moves
	slices.SortFunc(data.Windows, func(a, b types.DesktopWindow) int { return cmp.Compare(a.ID, b.ID) })
	return data
}

// topLevelWindows lists the windows Alt+Tab would: visible, not cloaked,
// unowned, and not tool windows
func topLevelWindows() []windows.HWND {
	enumMu.Lock()
	enumWindows = nil
	_ = windows.EnumWindows(enumCallback, nil)
	all := enumWindows
	enumWindows = nil
	enumMu.Unlock()

	shown := make([]windows.HWND, 0, len(all))
	for _, hwnd := range all {
		if !windows.IsWindowVisible(hwnd) {
			continue
		}
		if owner, _, _ := procGetWindow.Call(uintptr(hwnd), gwOwner); owner != 0 {
			continue
		}
		if style, _, _ := procGetWindowLongPtrW.Call(uintptr(hwnd), uintptr(gwlExStyleValue())); style&wsExToolWindow != 0 {
			continue
		}
		var cloaked uint32
		if err := windows.DwmGetWindowAttribute(hwnd, windows.DWMWA_CLOAKED, unsafe.Pointer(&cloaked), uint32(unsafe.Sizeof(cloaked))); err == nil && cloaked != 0 {
			continue
		}
		shown = append(shown, hwnd)
	}
	return shown
}

// gwlExStyleValue passes GWL_EXSTYLE, a negative index, as the unsigned
// argument the call takes
func gwlExStyleValue() uintptr {
	index := int32(gwlExStyle)
	return uintptr(index)
}

func callBool(proc *windows.LazyProc, hwnd windows.HWND) bool {
	ret, _, _ := proc.Call(uintptr(hwnd))
	return ret != 0
}

// windowDisplay is the display most of the window is on, named as the displays
// module names it
func windowDisplay(hwnd windows.HWND) *string {
	monitor, _, _ := procMonitorFromWindow.Call(uintptr(hwnd), monitorDefaultToNearest)
	if monitor == 0 {
		return nil
	}
	var info monitorInfoEx
	info.CbSize = uint32(unsafe.Sizeof(info))
	if ret, _, _ := procGetMonitorInfoW.Call(monitor, uintptr(unsafe.Pointer(&info))); ret == 0 {
		return nil
	}
	name := windows.UTF16ToString(info.DeviceName[:])
	name = strings.TrimPrefix(strings.TrimPrefix(name, `\\.\`), `\\?\`)
	return nonEmpty(name)
}

func windowText(hwnd windows.HWND) string {
	length, _, _ := procGetWindowTextLengthW.Call(uintptr(hwnd))
	if length == 0 {
		return ""
	}
	buffer := make([]uint16, length+1)
	copied, _, _ := procGetWindowTextW.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&buffer[0])), uintptr(len(buffer)))
	return windows.UTF16ToString(buffer[:copied])
}

func executableName(pid uint32) string {
	process, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
	if err != nil {
		return ""
	}
	defer func() { _ = windows.CloseHandle(process) }()

	buffer := make([]uint16, windows.MAX_LONG_PATH)
	size := uint32(len(buffer))
	if err := windows.QueryFullProcessImageName(process, 0, &buffer[0], &size); err != nil {
		return ""
	}
	return filepath.Base(windows.UTF16ToString(buffer[:size]))
}

// keyboard is the foreground window's keyboard layout, and the layouts
// installed
func keyboard(foreground windows.HWND) types.DesktopKeyboard {
	result := types.DesktopKeyboard{Layouts: []string{}}

	count, _, _ := procGetKeyboardLayoutList.Call(0, 0)
	if count > 0 {
		layouts := make([]windows.Handle, count)
		count, _, _ = procGetKeyboardLayoutList.Call(count, uintptr(unsafe.Pointer(&layouts[0])))
		for _, layout := range layouts[:count] {
			result.Layouts = append(result.Layouts, layoutID(layout))
		}
	}

	var thread uint32
	if foreground != 0 {
		thread, _ = windows.GetWindowThreadProcessId(foreground, nil)
	}
	layout := windows.GetKeyboardLayout(thread)
	if layout == 0 {
		return result
	}
	result.Layout = pointer(layoutID(layout))
	result.Name = nonEmpty(languageName(uint32(layout) & 0xFFFF))
	return result
}

// layoutID names a keyboard layout handle the way Windows names layouts, by
// its language and, for a layout other than the language's default, its
// device ID
func layoutID(layout windows.Handle) string {
	language := uint32(layout) & 0xFFFF
	device := (uint32(layout) >> 16) & 0xFFFF
	if device == 0 || device == language {
		return fmt.Sprintf("%08X", language)
	}
	return fmt.Sprintf("%04X%04X", device, language)
}

// languageName is the display name of a language, such as English (United
// Kingdom)
func languageName(language uint32) string {
	locale := make([]uint16, localeNameMaxLength)
	if ret, _, _ := procLCIDToLocaleName.Call(uintptr(language), uintptr(unsafe.Pointer(&locale[0])), uintptr(len(locale)), 0); ret == 0 {
		return ""
	}
	name := make([]uint16, 256)
	if ret, _, _ := procGetLocaleInfoEx.Call(uintptr(unsafe.Pointer(&locale[0])), localeSLocalizedDisplayName, uintptr(unsafe.Pointer(&name[0])), uintptr(len(name))); ret == 0 {
		return ""
	}
	return windows.UTF16ToString(name)
}
