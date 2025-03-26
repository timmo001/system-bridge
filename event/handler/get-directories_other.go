//go:build !windows
// +build !windows

package event_handler

func GetWindowsDirectories() (string, string, string, string, string, string) {
	return "", "", "", "", "", ""
}
