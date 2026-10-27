//go:build linux

package audio

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"slices"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// SetVolume sets an output's, input's or app's volume, in percent, on every
// channel
func SetVolume(ctx context.Context, id string, volume float64) error {
	kind, target, err := deviceKind(ctx, id)
	if err != nil {
		return err
	}
	return pactl(ctx, "set-"+kind+"-volume", target, strconv.FormatFloat(volume, 'f', -1, 64)+"%")
}

// SetMuted mutes or unmutes an output, input or app
func SetMuted(ctx context.Context, id string, muted bool) error {
	kind, target, err := deviceKind(ctx, id)
	if err != nil {
		return err
	}
	value := "0"
	if muted {
		value = "1"
	}
	return pactl(ctx, "set-"+kind+"-mute", target, value)
}

// SetDefault makes an output or input the default
func SetDefault(ctx context.Context, id string) error {
	kind, target, err := deviceKind(ctx, id)
	if err != nil {
		return err
	}
	if kind == "sink-input" {
		return fmt.Errorf("%w: an app can't be the default; move it to an output instead", ErrWrongKind)
	}
	return pactl(ctx, "set-default-"+kind, target)
}

// MoveApp moves an app's sound to another output
func MoveApp(ctx context.Context, id string, output string) error {
	kind, target, err := deviceKind(ctx, id)
	if err != nil {
		return err
	}
	if kind != "sink-input" {
		return fmt.Errorf("%w: only an app can be moved to another output", ErrWrongKind)
	}
	outputKind, _, err := deviceKind(ctx, output)
	if err != nil {
		return err
	}
	if outputKind != "sink" {
		return fmt.Errorf("%w: %s isn't an output", ErrWrongKind, output)
	}
	return pactl(ctx, "move-sink-input", target, output)
}

// deviceKind is pactl's name for the kind of device, sink for an output,
// source for an input or sink-input for an app, and what pactl calls it
func deviceKind(ctx context.Context, id string) (kind string, target string, err error) {
	data, err := GetAudioData(ctx)
	if err != nil {
		return "", "", err
	}
	hasID := func(device types.AudioDevice) bool { return device.ID == id }
	switch {
	case slices.ContainsFunc(data.Outputs, hasID):
		return "sink", id, nil
	case slices.ContainsFunc(data.Inputs, hasID):
		return "source", id, nil
	case slices.ContainsFunc(data.Apps, func(app types.AudioApp) bool { return app.ID == id }):
		return "sink-input", strings.TrimPrefix(id, appIDPrefix), nil
	}
	return "", "", ErrUnknownDevice
}

func pactl(ctx context.Context, args ...string) error {
	ctx, cancel := context.WithTimeout(ctx, pactlTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "pactl", args...)
	cmd.Env = append(os.Environ(), "LC_ALL=C")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("pactl %v: %w: %s", args, err, out)
	}
	return nil
}
