//go:build !linux

package input

func selectBackend() (Backend, string) {
	return robotgoBackend{name: "robotgo"}, ""
}

func lostConnection(error) bool { return false }
