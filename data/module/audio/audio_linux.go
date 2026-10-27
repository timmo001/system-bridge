//go:build linux

package audio

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"strconv"
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
	Index         int                            `json:"index"`
	Name          string                         `json:"name"`
	Description   string                         `json:"description"`
	Mute          bool                           `json:"mute"`
	Volume        map[string]struct{ Value int } `json:"volume"`
	MonitorOfSink *string                        `json:"monitor_of_sink"`
	Properties    map[string]string              `json:"properties"`
}

// pactlStream is an app's stream to an output, which pactl calls a sink
// input
type pactlStream struct {
	Index      int                            `json:"index"`
	Sink       int                            `json:"sink"`
	Mute       bool                           `json:"mute"`
	Corked     bool                           `json:"corked"`
	Volume     map[string]struct{ Value int } `json:"volume"`
	Properties map[string]string              `json:"properties"`
}

// appIDPrefix starts an app's id, so it can't be taken for a device's name
const appIDPrefix = "app:"

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

	var streams []pactlStream
	if err := pactlJSON(ctx, &streams, "list", "sink-inputs"); err != nil {
		return types.AudioData{}, err
	}

	data := types.AudioData{
		Outputs: make([]types.AudioDevice, 0, len(sinks)),
		Inputs:  make([]types.AudioDevice, 0, len(sources)),
		Apps:    make([]types.AudioApp, 0, len(streams)),
	}
	sinkNames := make(map[int]string, len(sinks))
	for _, sink := range sinks {
		sinkNames[sink.Index] = sink.Name
		data.Outputs = append(data.Outputs, sink.device(info.DefaultSinkName))
	}
	for _, stream := range streams {
		// Filters and loopbacks, such as a speaker equaliser, route sound
		// between outputs rather than being apps
		if stream.Properties["node.virtual"] == "true" || stream.Properties["node.passive"] == "true" {
			continue
		}
		data.Apps = append(data.Apps, stream.app(sinkNames))
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
	device.Volume = averageVolume(d.Volume)
	return device
}

func (s pactlStream) app(sinkNames map[int]string) types.AudioApp {
	app := types.AudioApp{
		ID:      appIDPrefix + strconv.Itoa(s.Index),
		Muted:   &s.Mute,
		Playing: !s.Corked,
		Volume:  averageVolume(s.Volume),
	}
	for _, name := range []string{s.Properties["application.name"], s.Properties["application.process.binary"], s.Properties["media.name"]} {
		if name != "" {
			app.Name = name
			break
		}
	}
	if title := s.Properties["media.name"]; title != "" && title != app.Name {
		app.Title = &title
	}
	if output, ok := sinkNames[s.Sink]; ok {
		app.Output = &output
	}
	return app
}

// averageVolume is the average of the channels' volumes, in percent, or nil
// when there are none
func averageVolume(channels map[string]struct{ Value int }) *float64 {
	if len(channels) == 0 {
		return nil
	}
	total := 0
	for _, channel := range channels {
		total += channel.Value
	}
	volume := math.Round(float64(total) / float64(len(channels)) / pulseVolumeNorm * 100)
	return &volume
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
