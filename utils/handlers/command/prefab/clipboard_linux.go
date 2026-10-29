//go:build linux

package prefab

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

const clipboardTimeout = 5 * time.Second

// clipboardGetters are the programs that can read the clipboard's text, in the
// order they're tried
var clipboardGetters = []candidate{
	{program: "wl-paste", arguments: []string{"--no-newline", "--type", "text"}, when: onWayland},
	{program: "xclip", arguments: []string{"-selection", "clipboard", "-target", "UTF8_STRING", "-o"}, when: onX11},
	{program: "xsel", arguments: []string{"--clipboard", "--output"}, when: onX11},
}

// clipboardSetters are the programs that can put text on the clipboard, in
// the order they're tried, the counterparts of clipboardGetters
var clipboardSetters = []candidate{
	{program: "wl-copy", when: onWayland},
	{program: "xclip", arguments: []string{"-selection", "clipboard", "-in"}, when: onX11},
	{program: "xsel", arguments: []string{"--clipboard", "--input"}, when: onX11},
}

// GetClipboard returns the text on the desktop session's clipboard
func GetClipboard(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, clipboardTimeout)
	defer cancel()

	for _, getter := range clipboardGetters {
		if getter.when != nil && !getter.when() {
			continue
		}
		path, err := exec.LookPath(getter.program)
		if err != nil {
			continue
		}
		cmd := exec.CommandContext(ctx, path, getter.arguments...)
		cmd.Env = sessionEnv()
		var stderr strings.Builder
		cmd.Stderr = &stderr
		output, err := cmd.Output()
		if err != nil {
			// wl-paste fails when nothing has been copied, or only something
			// other than text such as an image, which is an empty clipboard
			// rather than an error
			if problem := stderr.String(); strings.Contains(problem, "Nothing is copied") || strings.Contains(problem, "not available as requested type") {
				return "", nil
			}
			return "", fmt.Errorf("%s: %w", getter.program, err)
		}
		return string(output), nil
	}
	return "", errors.New("install wl-clipboard on Wayland, or xclip or xsel on X11, to read the clipboard")
}

// SetClipboard puts text on the desktop session's clipboard
func SetClipboard(ctx context.Context, text string) error {
	ctx, cancel := context.WithTimeout(ctx, clipboardTimeout)
	defer cancel()

	for _, setter := range clipboardSetters {
		if setter.when != nil && !setter.when() {
			continue
		}
		path, err := exec.LookPath(setter.program)
		if err != nil {
			continue
		}
		cmd := exec.CommandContext(ctx, path, setter.arguments...)
		cmd.Env = sessionEnv()
		cmd.Stdin = strings.NewReader(text)
		// Each leaves a process behind to hold the clipboard, which would keep
		// an output pipe open, so only its exit status is read
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("%s: %w", setter.program, err)
		}
		return nil
	}
	return errors.New("install wl-clipboard on Wayland, or xclip or xsel on X11, to set the clipboard")
}
