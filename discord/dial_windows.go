//go:build windows

package discord

import (
	"errors"
	"fmt"
	"net"
	"os"
	"time"

	"github.com/Microsoft/go-winio"
)

// socketAvailable reports whether Discord's IPC pipe exists, without
// connecting to it.
func socketAvailable() bool {
	for i := range 10 {
		if _, err := os.Stat(fmt.Sprintf(`\\.\pipe\discord-ipc-%d`, i)); err == nil {
			return true
		}
	}
	return false
}

// Discord uses a named pipe on Windows. go-winio opens it with overlapped I/O,
// so a pending read does not block writes.
func dial() (net.Conn, error) {
	timeout := time.Second
	for i := range 10 {
		conn, err := winio.DialPipe(fmt.Sprintf(`\\.\pipe\discord-ipc-%d`, i), &timeout)
		if err == nil {
			return conn, nil
		}
	}
	return nil, errors.New("no Discord IPC pipe found")
}
