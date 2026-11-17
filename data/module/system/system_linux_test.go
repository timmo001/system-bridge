//go:build linux

package system

import (
	"slices"
	"testing"
)

func TestPipeWireCaptureAppsCameraIgnoresScreencasts(t *testing.T) {
	// From a KRdp session reading KWin's screencast, beside a browser using
	// the webcam
	dump := []byte(`[
		{"id": 81, "type": "PipeWire:Interface:Node", "info": {"state": "running", "props": {"media.class": "Video/Source", "media.role": "Camera", "node.name": "v4l2_input.webcam"}}},
		{"id": 90, "type": "PipeWire:Interface:Node", "info": {"state": "running", "props": {"media.class": "Stream/Input/Video", "application.name": "Firefox"}}},
		{"id": 94, "type": "PipeWire:Interface:Node", "info": {"state": "running", "props": {"media.class": "Stream/Output/Video", "node.name": "kwin_wayland"}}},
		{"id": 97, "type": "PipeWire:Interface:Node", "info": {"state": "running", "props": {"media.class": "Stream/Input/Video", "node.name": "krdpserver"}}},
		{"id": 98, "type": "PipeWire:Interface:Link", "info": {"output-node-id": 81, "input-node-id": 90, "state": "active"}},
		{"id": 99, "type": "PipeWire:Interface:Link", "info": {"output-node-id": 94, "input-node-id": 97, "state": "active"}}
	]`)
	graph, err := parsePipeWireDump(dump)
	if err != nil {
		t.Fatalf("parsePipeWireDump: %v", err)
	}

	if got, want := graph.captureApps("Stream/Input/Video", "Camera"), []string{"Firefox"}; !slices.Equal(got, want) {
		t.Errorf("camera apps = %v, want %v", got, want)
	}
}
