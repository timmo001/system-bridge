//go:build windows

package desktop

import (
	"context"
	"fmt"
	"runtime"
	"slices"
	"strconv"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	swMaximize               = 3
	swMinimize               = 6
	swRestore                = 9
	wmClose                  = 0x0010
	wmInputLangChangeRequest = 0x0050
)

var (
	procAttachThreadInput   = modUser32.NewProc("AttachThreadInput")
	procBringWindowToTop    = modUser32.NewProc("BringWindowToTop")
	procPostMessageW        = modUser32.NewProc("PostMessageW")
	procSetForegroundWindow = modUser32.NewProc("SetForegroundWindow")
	procShowWindowAsync     = modUser32.NewProc("ShowWindowAsync")
)

// window is the listed window with an ID, so actions only reach the windows
// the module reports
func window(id string) (windows.HWND, error) {
	value, err := strconv.ParseUint(strings.TrimPrefix(id, "0x"), 16, 64)
	if err == nil {
		hwnd := windows.HWND(value)
		if slices.Contains(topLevelWindows(), hwnd) {
			return hwnd, nil
		}
	}
	return 0, fmt.Errorf("window %q: %w", id, ErrNotFound)
}

// FocusWindow brings a window to the front and focuses it
func FocusWindow(_ context.Context, id string) error {
	hwnd, err := window(id)
	if err != nil {
		return err
	}
	if callBool(procIsIconic, hwnd) {
		_, _, _ = procShowWindowAsync.Call(uintptr(hwnd), swRestore)
	}

	// Windows only lets the app with the focus give it away, so share the
	// focused window's input state while asking
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	current := windows.GetCurrentThreadId()
	foreground, _ := windows.GetWindowThreadProcessId(windows.GetForegroundWindow(), nil)
	if foreground != 0 && foreground != current {
		_, _, _ = procAttachThreadInput.Call(uintptr(current), uintptr(foreground), 1)
		defer func() { _, _, _ = procAttachThreadInput.Call(uintptr(current), uintptr(foreground), 0) }()
	}
	_, _, _ = procBringWindowToTop.Call(uintptr(hwnd))
	if ret, _, err := procSetForegroundWindow.Call(uintptr(hwnd)); ret == 0 {
		return fmt.Errorf("Windows didn't focus the window: %w", err)
	}
	return nil
}

// CloseWindow asks a window to close, as its close button would
func CloseWindow(_ context.Context, id string) error {
	hwnd, err := window(id)
	if err != nil {
		return err
	}
	if ret, _, err := procPostMessageW.Call(uintptr(hwnd), wmClose, 0, 0); ret == 0 {
		return fmt.Errorf("failed to close the window: %w", err)
	}
	return nil
}

// SetWindowState maximises, minimises or restores a window
func SetWindowState(_ context.Context, id string, state WindowState) error {
	hwnd, err := window(id)
	if err != nil {
		return err
	}
	if state.Fullscreen != nil {
		return fmt.Errorf("fullscreen: %w", ErrUnsupported)
	}
	show := func(command uintptr) {
		_, _, _ = procShowWindowAsync.Call(uintptr(hwnd), command)
	}
	if state.Maximised != nil {
		switch {
		case *state.Maximised:
			show(swMaximize)
		case callBool(procIsZoomed, hwnd):
			show(swRestore)
		}
	}
	if state.Minimised != nil {
		switch {
		case *state.Minimised:
			show(swMinimize)
		case callBool(procIsIconic, hwnd):
			show(swRestore)
		}
	}
	return nil
}

// FocusWorkspace isn't possible, as Windows has no public API for virtual
// desktops
func FocusWorkspace(context.Context, string) error {
	return fmt.Errorf("virtual desktops: %w", ErrUnsupported)
}

// SetKeyboardLayout asks the focused window to switch to an installed layout
func SetKeyboardLayout(_ context.Context, layout string) error {
	count, _, _ := procGetKeyboardLayoutList.Call(0, 0)
	if count == 0 {
		return fmt.Errorf("keyboard layout %q: %w", layout, ErrNotFound)
	}
	layouts := make([]windows.Handle, count)
	count, _, _ = procGetKeyboardLayoutList.Call(count, uintptr(unsafe.Pointer(&layouts[0])))
	for _, handle := range layouts[:count] {
		if layoutID(handle) != layout {
			continue
		}
		// Layouts belong to each app's thread, so the focused one is asked
		foreground := windows.GetForegroundWindow()
		if ret, _, err := procPostMessageW.Call(uintptr(foreground), wmInputLangChangeRequest, 0, uintptr(handle)); ret == 0 {
			return fmt.Errorf("failed to switch the keyboard layout: %w", err)
		}
		return nil
	}
	return fmt.Errorf("keyboard layout %q: %w", layout, ErrNotFound)
}
