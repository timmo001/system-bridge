//go:build linux

package media

import (
	"context"
	"fmt"
	"time"

	"github.com/godbus/dbus/v5"
)

const mprisTimeout = 2 * time.Second

// mprisCapabilities is what an MPRIS player says it can do, which playerctl's
// format can't report
type mprisCapabilities struct {
	next     bool
	previous bool
	play     bool
	pause    bool
}

// readCapabilities asks the player with playerctl's instance name, such as
// chromium.instance1234, what it can do
func readCapabilities(instance string) (mprisCapabilities, error) {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return mprisCapabilities{}, fmt.Errorf("connect to the session bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), mprisTimeout)
	defer cancel()

	var properties map[string]dbus.Variant
	if err := conn.Object("org.mpris.MediaPlayer2."+instance, "/org/mpris/MediaPlayer2").
		CallWithContext(ctx, "org.freedesktop.DBus.Properties.GetAll", 0, "org.mpris.MediaPlayer2.Player").
		Store(&properties); err != nil {
		return mprisCapabilities{}, fmt.Errorf("read %s's properties: %w", instance, err)
	}

	flag := func(name string) bool {
		value, _ := properties[name].Value().(bool)
		return value
	}
	// A player that can't be controlled can't do anything else either
	control := flag("CanControl")
	return mprisCapabilities{
		next:     control && flag("CanGoNext"),
		previous: control && flag("CanGoPrevious"),
		play:     control && flag("CanPlay"),
		pause:    control && flag("CanPause"),
	}, nil
}
