//go:build linux

package cameras

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
)

// captureSkipFrames lets a camera that's only just started settle its
// exposure and white balance before the frame that's kept
const captureSkipFrames = 5

// errDeviceBusy is what ffmpeg reports when another process is streaming
// from the device
var errDeviceBusy = errors.New("device busy")

// Capture takes a JPEG picture with a camera, by its id from the cameras
// module. A camera nothing is using is opened over V4L2 with ffmpeg. One
// PipeWire is streaming to other apps is shared through PipeWire with
// GStreamer. One another app has open directly can't be used until it's done.
func Capture(ctx context.Context, camera string) ([]byte, error) {
	if !captureEnabled() {
		return nil, ErrNotAllowed
	}
	device, err := cameraDevice(camera)
	if err != nil {
		return nil, err
	}

	image, err := captureV4L2(ctx, device)
	if !errors.Is(err, errDeviceBusy) {
		return image, err
	}
	if apps := deviceHolders(device); len(apps) > 0 {
		return nil, fmt.Errorf("%w by %s", ErrBusy, strings.Join(apps, ", "))
	}
	return capturePipeWire(ctx, device)
}

func captureV4L2(ctx context.Context, device string) ([]byte, error) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		return nil, fmt.Errorf("%w: install ffmpeg to take pictures", ErrUnsupported)
	}
	args := func(inputFormat ...string) []string {
		return slices.Concat(
			[]string{"-hide_banner", "-loglevel", "error", "-f", "v4l2"},
			inputFormat,
			[]string{
				"-i", device,
				"-vf", fmt.Sprintf("select=gte(n\\,%d)", captureSkipFrames),
				"-frames:v", "1",
				"-f", "image2pipe", "-c:v", "mjpeg", "-q:v", "3",
				"pipe:1",
			},
		)
	}

	// MJPEG starts fastest at full size, but not every camera has it, so
	// those use whatever format they're set to
	image, err := runCapture(ctx, ffmpeg, args("-input_format", "mjpeg")...)
	if err != nil && !errors.Is(err, errDeviceBusy) && ctx.Err() == nil {
		image, err = runCapture(ctx, ffmpeg, args()...)
	}
	return image, err
}

func capturePipeWire(ctx context.Context, device string) ([]byte, error) {
	gst, err := exec.LookPath("gst-launch-1.0")
	if err != nil {
		return nil, fmt.Errorf("%w: install GStreamer's PipeWire plugin to take pictures while another app uses the camera", ErrBusy)
	}
	node, err := pipeWireNode(ctx, device)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrBusy, err)
	}
	// Another app is already streaming, so the first frame is settled. The
	// caps let WirePlumber link the camera, in whichever format it's in.
	return runCapture(ctx, gst, "-q",
		"pipewiresrc", "target-object="+node, "!",
		"image/jpeg;video/x-raw", "!",
		"decodebin", "!", "videoconvert", "!",
		"jpegenc", "snapshot=true", "!",
		"fdsink", "fd=1",
	)
}

// runCapture runs a command that writes a JPEG to its output
func runCapture(ctx context.Context, name string, args ...string) ([]byte, error) {
	var stdout, stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	program := filepath.Base(name)
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("%s took too long to take a picture: %w", program, ctx.Err())
		}
		message := strings.TrimSpace(stderr.String())
		if strings.Contains(message, "Device or resource busy") {
			return nil, errDeviceBusy
		}
		if lines := strings.Split(message, "\n"); message != "" {
			message = lines[len(lines)-1]
		}
		return nil, fmt.Errorf("%s failed to take a picture: %w: %s", program, err, message)
	}
	if !bytes.HasPrefix(stdout.Bytes(), []byte{0xff, 0xd8}) {
		return nil, fmt.Errorf("%s didn't return a JPEG picture", program)
	}
	return stdout.Bytes(), nil
}

// pipeWireNode returns the name of the PipeWire node streaming device
func pipeWireNode(ctx context.Context, device string) (string, error) {
	out, err := exec.CommandContext(ctx, "pw-dump").Output()
	if err != nil {
		return "", fmt.Errorf("failed to read PipeWire's nodes: %w", err)
	}
	var objects []struct {
		Type string `json:"type"`
		Info struct {
			Props struct {
				MediaClass string `json:"media.class"`
				Path       string `json:"api.v4l2.path"`
				NodeName   string `json:"node.name"`
			} `json:"props"`
		} `json:"info"`
	}
	if err := json.Unmarshal(out, &objects); err != nil {
		return "", fmt.Errorf("failed to parse PipeWire's nodes: %w", err)
	}
	for _, object := range objects {
		props := object.Info.Props
		if object.Type == "PipeWire:Interface:Node" && props.MediaClass == "Video/Source" && props.Path == device && props.NodeName != "" {
			return props.NodeName, nil
		}
	}
	return "", fmt.Errorf("PipeWire has no node for %s", device)
}

// deviceHolders returns the names of the apps with device open, other than
// PipeWire, which shares it, and System Bridge itself
func deviceHolders(device string) []string {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return nil
	}
	self := strconv.Itoa(os.Getpid())
	var names []string
	for _, entry := range entries {
		pid := entry.Name()
		if _, err := strconv.Atoi(pid); err != nil || pid == self {
			continue
		}
		fds, err := os.ReadDir("/proc/" + pid + "/fd")
		if err != nil {
			// Other users' processes can't be read
			continue
		}
		holds := slices.ContainsFunc(fds, func(fd os.DirEntry) bool {
			link, err := os.Readlink("/proc/" + pid + "/fd/" + fd.Name())
			return err == nil && link == device
		})
		if !holds {
			continue
		}
		comm, err := os.ReadFile("/proc/" + pid + "/comm")
		name := strings.TrimSpace(string(comm))
		if err != nil || name == "" || name == "pipewire" || name == "wireplumber" || slices.Contains(names, name) {
			continue
		}
		names = append(names, name)
	}
	slices.Sort(names)
	return names
}
