//go:build linux

package media

import (
	"context"

	mediamodule "github.com/timmo001/system-bridge/data/module/media"
)

// control acts on a player the Media module lists, over MPRIS
func control(request Request) error {
	return mediamodule.Control(context.Background(), mediamodule.ControlRequest{
		Action:   string(request.Action),
		Player:   request.Player,
		Position: request.Position,
		Volume:   request.Volume,
		Shuffle:  request.Shuffle,
		Repeat:   request.Repeat,
	})
}
