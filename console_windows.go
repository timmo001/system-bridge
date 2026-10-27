//go:build windows

package main

import (
	"os"

	"golang.org/x/sys/windows"
)

const attachParentProcess = ^uint32(0)

// attachConsole sends output to the console the app was started from. The
// release build is a windowed app, so Windows gives it no console of its own
// and commands such as `client token` would print nothing. Output that is
// already redirected to a file or pipe is left alone.
func attachConsole() {
	stdout := needsConsole(windows.STD_OUTPUT_HANDLE)
	stderr := needsConsole(windows.STD_ERROR_HANDLE)
	if !stdout && !stderr {
		return
	}

	attach := windows.NewLazySystemDLL("kernel32.dll").NewProc("AttachConsole")
	if ok, _, _ := attach.Call(uintptr(attachParentProcess)); ok == 0 {
		return
	}

	console, err := os.OpenFile("CONOUT$", os.O_WRONLY, 0)
	if err != nil {
		return
	}
	if stdout {
		os.Stdout = console
	}
	if stderr {
		os.Stderr = console
	}
}

func needsConsole(stdHandle uint32) bool {
	handle, err := windows.GetStdHandle(stdHandle)
	return err != nil || handle == 0 || handle == windows.InvalidHandle
}
