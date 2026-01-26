//go:build linux

package notification

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// playSound attempts to play a sound file using available audio players
// Tries paplay (PulseAudio/PipeWire) first, then falls back to aplay (ALSA)
func playSound(soundFile string) error {
	if soundFile == "" {
		return nil
	}

	// Expand tilde and resolve absolute path
	expandedPath, err := expandPath(soundFile)
	if err != nil {
		return fmt.Errorf("failed to expand sound file path: %w", err)
	}

	// Check if file exists
	if _, err := os.Stat(expandedPath); os.IsNotExist(err) {
		return fmt.Errorf("sound file does not exist: %s", expandedPath)
	}

	// Try paplay first (PulseAudio/PipeWire - most common on modern Linux)
	if err := tryPlaySound("paplay", expandedPath); err == nil {
		return nil
	}

	// Fallback to aplay (ALSA)
	if err := tryPlaySound("aplay", expandedPath); err == nil {
		return nil
	}

	return fmt.Errorf("no audio player available (tried paplay and aplay)")
}

// tryPlaySound attempts to play a sound using the specified command
func tryPlaySound(cmd, file string) error {
	player := exec.Command(cmd, file)
	if err := player.Run(); err != nil {
		return fmt.Errorf("%s failed: %w", cmd, err)
	}
	return nil
}

// expandPath expands ~ to home directory and resolves to absolute path
func expandPath(path string) (string, error) {
	if len(path) > 0 && path[0] == '~' {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		path = filepath.Join(home, path[1:])
	}
	return filepath.Abs(path)
}
