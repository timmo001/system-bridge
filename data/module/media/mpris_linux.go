//go:build linux

package media

import (
	"context"
	"fmt"
	"math"
	"slices"
	"strings"
	"time"

	"github.com/godbus/dbus/v5"
)

const (
	mprisTimeout   = 2 * time.Second
	mprisPrefix    = "org.mpris.MediaPlayer2."
	mprisPath      = dbus.ObjectPath("/org/mpris/MediaPlayer2")
	mprisInterface = "org.mpris.MediaPlayer2.Player"
)

// mprisPlayer is what one MPRIS player reports about itself
type mprisPlayer struct {
	instance   string // its bus name without the MPRIS prefix, such as chromium.instance1234
	properties map[string]dbus.Variant
	metadata   map[string]dbus.Variant
}

// name is the player's name without its instance, such as chromium
func (p mprisPlayer) name() string {
	name, _, _ := strings.Cut(p.instance, ".")
	return name
}

func (p mprisPlayer) status() string {
	status, _ := p.properties["PlaybackStatus"].Value().(string)
	return status
}

func (p mprisPlayer) flag(name string) bool {
	value, _ := p.properties[name].Value().(bool)
	return value
}

// can reports a capability, which needs the player to accept control at all
func (p mprisPlayer) can(name string) bool {
	return p.flag("CanControl") && p.flag(name)
}

func (p mprisPlayer) title() string {
	return p.text("xesam:title")
}

// text reads a metadata string, or the names of a list such as the artists
func (p mprisPlayer) text(key string) string {
	switch value := p.metadata[key].Value().(type) {
	case string:
		return value
	case []string:
		return strings.Join(value, ", ")
	}
	return ""
}

// microseconds reads a duration or position, which players send as any
// integer type, in seconds. ok is false when it's missing or endless, as a
// live stream's length is.
func microseconds(variant dbus.Variant) (seconds float64, ok bool) {
	var value float64
	switch v := variant.Value().(type) {
	case int64:
		if v == math.MaxInt64 {
			return 0, false
		}
		value = float64(v)
	case uint64:
		if v >= math.MaxInt64 {
			return 0, false
		}
		value = float64(v)
	case int32:
		value = float64(v)
	case uint32:
		value = float64(v)
	case float64:
		value = v
	default:
		return 0, false
	}
	if value < 0 {
		return 0, false
	}
	return value / 1e6, true
}

// listPlayers reads every MPRIS player on the session bus, sorted by name.
// playerctld is left out, as it only stands in for another player.
func listPlayers(ctx context.Context) ([]mprisPlayer, error) {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return nil, fmt.Errorf("connect to the session bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	ctx, cancel := context.WithTimeout(ctx, mprisTimeout)
	defer cancel()

	var names []string
	if err := conn.BusObject().CallWithContext(ctx, "org.freedesktop.DBus.ListNames", 0).Store(&names); err != nil {
		return nil, fmt.Errorf("list the session bus's names: %w", err)
	}
	slices.Sort(names)

	players := []mprisPlayer{}
	for _, name := range names {
		instance, found := strings.CutPrefix(name, mprisPrefix)
		if !found || instance == "playerctld" {
			continue
		}
		player := mprisPlayer{instance: instance}
		if err := conn.Object(name, mprisPath).
			CallWithContext(ctx, "org.freedesktop.DBus.Properties.GetAll", 0, mprisInterface).
			Store(&player.properties); err != nil {
			// A player can close while it's being read
			continue
		}
		player.metadata, _ = player.properties["Metadata"].Value().(map[string]dbus.Variant)
		players = append(players, player)
	}
	return players, nil
}

// pickPlayer is the player the module reports and controls: the first
// playing, then the first paused with a track, then the first paused, then
// the first with a track, else the first. nil when there are none.
func pickPlayer(players []mprisPlayer) *mprisPlayer {
	for _, wanted := range []struct {
		status   string
		hasTrack bool
	}{
		{"Playing", false},
		{"Paused", true},
		{"Paused", false},
		{"", true},
		{"", false},
	} {
		for i := range players {
			if wanted.status != "" && players[i].status() != wanted.status {
				continue
			}
			if wanted.hasTrack && players[i].title() == "" {
				continue
			}
			return &players[i]
		}
	}
	return nil
}

// callPlayer calls one of the player's methods, such as PlayPause
func callPlayer(ctx context.Context, instance, method string, args ...any) error {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return fmt.Errorf("connect to the session bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	ctx, cancel := context.WithTimeout(ctx, mprisTimeout)
	defer cancel()

	if err := conn.Object(mprisPrefix+instance, mprisPath).
		CallWithContext(ctx, mprisInterface+"."+method, 0, args...).Err; err != nil {
		return fmt.Errorf("call %s on %s: %w", method, instance, err)
	}
	return nil
}

// setPlayer sets one of the player's properties, such as Volume
func setPlayer(ctx context.Context, instance, property string, value any) error {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return fmt.Errorf("connect to the session bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	ctx, cancel := context.WithTimeout(ctx, mprisTimeout)
	defer cancel()

	if err := conn.Object(mprisPrefix+instance, mprisPath).
		CallWithContext(ctx, "org.freedesktop.DBus.Properties.Set", 0, mprisInterface, property, dbus.MakeVariant(value)).Err; err != nil {
		return fmt.Errorf("set %s on %s: %w", property, instance, err)
	}
	return nil
}
