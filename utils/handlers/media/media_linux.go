//go:build linux

package media

import (
	"context"

	mediamodule "github.com/timmo001/system-bridge/data/module/media"
)

// control acts on the player the Media module shows, over MPRIS
func control(action MediaAction) error {
	return mediamodule.Control(context.Background(), string(action))
}
