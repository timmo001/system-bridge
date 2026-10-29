//go:build !linux

package prefab

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"time"
)

const clipboardTimeout = 5 * time.Second

// clipboardGetters are the programs that read the clipboard's text, keyed by
// runtime.GOOS
var clipboardGetters = map[string]candidate{
	"windows": {program: "powershell.exe", arguments: []string{"-NoProfile", "-NonInteractive", "-Command", "Get-Clipboard -Raw"}},
	"darwin":  {program: "pbpaste"},
}

// GetClipboard returns the text on the clipboard
func GetClipboard(ctx context.Context) (string, error) {
	getter, ok := clipboardGetters[goos]
	if !ok {
		return "", errors.New("reading the clipboard isn't supported on this platform")
	}
	ctx, cancel := context.WithTimeout(ctx, clipboardTimeout)
	defer cancel()

	output, err := exec.CommandContext(ctx, getter.program, getter.arguments...).Output()
	if err != nil {
		return "", fmt.Errorf("%s: %w", getter.program, err)
	}
	return string(output), nil
}

// SetClipboard isn't supported on this platform yet
func SetClipboard(context.Context, string) error {
	return errors.New("setting the clipboard is only supported on Linux")
}
