//go:build windows
// +build windows

package media

import (
	"fmt"
	"os/exec"

	"github.com/timmo001/system-bridge/utils"
)

func control(action MediaAction) error {
	var script string

	switch action {
	case MediaActionPlay, MediaActionPause:
		script = "(New-Object -ComObject WScript.Shell).SendKeys([char]179)"
	case MediaActionNext:
		script = "(New-Object -ComObject WScript.Shell).SendKeys([char]176)"
	case MediaActionPrevious:
		script = "(New-Object -ComObject WScript.Shell).SendKeys([char]177)"
	case MediaActionStop:
		script = "(New-Object -ComObject WScript.Shell).SendKeys([char]178)"
	case MediaActionVolumeUp:
		script = "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"
	case MediaActionVolumeDown:
		script = "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"
	case MediaActionMute:
		script = "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"
	default:
		return fmt.Errorf("unsupported media action: %s", action)
	}

	cmd := exec.Command("powershell", "-Command", script)
	utils.SetHideWindow(cmd)
	return cmd.Run()
}
