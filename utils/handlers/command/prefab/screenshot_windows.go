//go:build windows

package prefab

import (
	"context"
	"errors"
	"fmt"
	"image"
	"image/png"
	"os"
	"unsafe"

	"github.com/vcaesar/screenshot"
	"golang.org/x/sys/windows"
)

var procGetWindowRect = windows.NewLazySystemDLL("user32.dll").NewProc("GetWindowRect")

// screenshotBuiltin captures every display, as one image covering their
// combined bounds
func screenshotBuiltin(_ context.Context, arguments []string) error {
	displays := screenshot.NumActiveDisplays()
	if displays == 0 {
		return errors.New("no displays found")
	}
	bounds := image.Rectangle{}
	for i := range displays {
		bounds = bounds.Union(screenshot.GetDisplayBounds(i))
	}
	return captureTo(bounds, arguments)
}

// screenshotWindowBuiltin captures the foreground window
func screenshotWindowBuiltin(_ context.Context, arguments []string) error {
	hwnd := windows.GetForegroundWindow()
	if hwnd == 0 {
		return errors.New("no window has focus")
	}
	var rect windows.Rect
	if ok, _, err := procGetWindowRect.Call(uintptr(hwnd), uintptr(unsafe.Pointer(&rect))); ok == 0 {
		return fmt.Errorf("get the window's bounds: %w", err)
	}
	return captureTo(image.Rect(int(rect.Left), int(rect.Top), int(rect.Right), int(rect.Bottom)), arguments)
}

// captureTo captures bounds and saves them as a PNG to the first argument
func captureTo(bounds image.Rectangle, arguments []string) error {
	if len(arguments) == 0 {
		return errors.New("no file to save the screenshot to")
	}
	img, err := screenshot.CaptureRect(bounds)
	if err != nil {
		return fmt.Errorf("capture the screen: %w", err)
	}
	file, err := os.Create(arguments[0])
	if err != nil {
		return fmt.Errorf("create %s: %w", arguments[0], err)
	}
	if err := png.Encode(file, img); err != nil {
		_ = file.Close()
		return fmt.Errorf("save the screenshot: %w", err)
	}
	return file.Close()
}
