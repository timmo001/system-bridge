//go:build linux

package audio

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"time"

	"github.com/timmo001/system-bridge/types"
)

const pactlTimeout = 5 * time.Second

// pulseVolumeNorm is PA_VOLUME_NORM, the raw volume of 100%
const pulseVolumeNorm = 65536

type pactlInfo struct {
	DefaultSinkName   string `json:"default_sink_name"`
	DefaultSourceName string `json:"default_source_name"`
}

type pactlDevice struct {
	Name          string                         `json:"name"`
	Description   string                         `json:"description"`
	Mute          bool                           `json:"mute"`
	Volume        map[string]struct{ Value int } `json:"volume"`
	MonitorOfSink *string                        `json:"monitor_of_sink"`
	Properties    map[string]string              `json:"properties"`
}

// GetAudioData reads the outputs and inputs through pactl, which works with
// both PulseAudio and PipeWire's PulseAudio server. Its JSON output needs
// PulseAudio 16 or later.
func GetAudioData(ctx context.Context) (types.AudioData, error) {
	ctx, cancel := context.WithTimeout(ctx, pactlTimeout)
	defer cancel()

	var info pactlInfo
	if err := pactlJSON(ctx, &info, "info"); err != nil {
		return types.AudioData{}, err
	}
	var sinks, sources []pactlDevice
	if err := pactlJSON(ctx, &sinks, "list", "sinks"); err != nil {
		return types.AudioData{}, err
	}
	if err := pactlJSON(ctx, &sources, "list", "sources"); err != nil {
		return types.AudioData{}, err
	}

	data := types.AudioData{
		Outputs: make([]types.AudioDevice, 0, len(sinks)),
		Inputs:  make([]types.AudioDevice, 0, len(sources)),
	}
	for _, sink := range sinks {
		data.Outputs = append(data.Outputs, sink.device(info.DefaultSinkName))
	}
	for _, source := range sources {
		// Each output has a monitor source that records what it plays. These
		// aren't microphones, so leave them out. PipeWire marks them with the
		// monitor device class and PulseAudio with monitor_of_sink.
		if source.Properties["device.class"] == "monitor" || (source.MonitorOfSink != nil && *source.MonitorOfSink != "n/a") {
			continue
		}
		data.Inputs = append(data.Inputs, source.device(info.DefaultSourceName))
	}
	return data, nil
}

func (d pactlDevice) device(defaultName string) types.AudioDevice {
	device := types.AudioDevice{
		ID:      d.Name,
		Name:    d.Description,
		Muted:   &d.Mute,
		Default: d.Name == defaultName,
	}
	if device.Name == "" {
		device.Name = d.Name
	}
	if len(d.Volume) > 0 {
		total := 0
		for _, channel := range d.Volume {
			total += channel.Value
		}
		volume := math.Round(float64(total) / float64(len(d.Volume)) / pulseVolumeNorm * 100)
		device.Volume = &volume
	}
	return device
}

func pactlJSON(ctx context.Context, v any, args ...string) error {
	cmd := exec.CommandContext(ctx, "pactl", append([]string{"--format=json"}, args...)...)
	cmd.Env = append(os.Environ(), "LC_ALL=C")
	out, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("pactl %v: %w", args, err)
	}
	if err := json.Unmarshal(out, v); err != nil {
		return fmt.Errorf("pactl %v: %w", args, err)
	}
	return nil
}
