//go:build !windows

package discord

import (
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"time"
)

func socketPaths() []string {
	var bases []string
	for _, env := range []string{"XDG_RUNTIME_DIR", "TMPDIR", "TMP", "TEMP"} {
		if v := os.Getenv(env); v != "" {
			bases = append(bases, v)
		}
	}
	bases = append(bases, "/tmp")

	// Flatpak and Snap builds of Discord create the socket in a subdirectory.
	subdirs := []string{"", "app/com.discordapp.Discord", "snap.discord"}

	var paths []string
	for _, base := range bases {
		for _, sub := range subdirs {
			for i := range 10 {
				paths = append(paths, filepath.Join(base, sub, fmt.Sprintf("discord-ipc-%d", i)))
			}
		}
	}
	return paths
}

func dial() (net.Conn, error) {
	for _, path := range socketPaths() {
		conn, err := net.DialTimeout("unix", path, time.Second)
		if err == nil {
			return conn, nil
		}
	}
	return nil, errors.New("no Discord IPC socket found")
}
