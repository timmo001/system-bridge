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

// clipboardSetters are the programs that can put text on the clipboard, in
// the order they're tried, the counterparts of the clipboard prefab's
var clipboardSetters = []candidate{
	{program: "wl-copy", when: onWayland},
	{program: "xclip", arguments: []string{"-selection", "clipboard", "-in"}, when: onX11},
	{program: "xsel", arguments: []string{"--clipboard", "--input"}, when: onX11},
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
