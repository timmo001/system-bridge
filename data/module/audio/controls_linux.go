//go:build linux

package audio

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"slices"
	"strconv"

	"github.com/timmo001/system-bridge/types"
)

// SetVolume sets an output's or input's volume, in percent, on every channel
func SetVolume(ctx context.Context, id string, volume float64) error {
	kind, err := deviceKind(ctx, id)
	if err != nil {
		return err
	}
	return pactl(ctx, "set-"+kind+"-volume", id, strconv.FormatFloat(volume, 'f', -1, 64)+"%")
}

// SetMuted mutes or unmutes an output or input
func SetMuted(ctx context.Context, id string, muted bool) error {
	kind, err := deviceKind(ctx, id)
	if err != nil {
		return err
	}
	value := "0"
	if muted {
		value = "1"
	}
	return pactl(ctx, "set-"+kind+"-mute", id, value)
}

// SetDefault makes an output or input the default
func SetDefault(ctx context.Context, id string) error {
	kind, err := deviceKind(ctx, id)
	if err != nil {
		return err
	}
	return pactl(ctx, "set-default-"+kind, id)
}

// deviceKind is pactl's name for the kind of device: sink for an output, source
// for an input
func deviceKind(ctx context.Context, id string) (string, error) {
	data, err := GetAudioData(ctx)
	if err != nil {
		return "", err
	}
	hasID := func(device types.AudioDevice) bool { return device.ID == id }
	switch {
	case slices.ContainsFunc(data.Outputs, hasID):
		return "sink", nil
	case slices.ContainsFunc(data.Inputs, hasID):
		return "source", nil
	}
	return "", ErrUnknownDevice
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
