//go:build linux

package system

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
	"unsafe"

	"github.com/shirou/gopsutil/v4/process"
	"golang.org/x/sys/unix"

	"github.com/timmo001/system-bridge/utils/watch"
)

const videoDevicePrefix = "/dev/video"

// cameraRescanDelay lets the opens and closes of one app starting or
// stopping its camera settle before /proc is read again.
const cameraRescanDelay = 100 * time.Millisecond

// cameraHolders caches the processes holding a video device open while
// followCameras keeps it current, so updates skip reading /proc.
var cameraHolders struct {
	sync.Mutex
	watched bool
	pids    []int32
}

// GetCameraUsage returns the apps using a camera on Linux: the processes
// holding a /dev/video* device open, and the apps streaming one through
// PipeWire.
func GetCameraUsage() []string {
	cameraHolders.Lock()
	pids := cameraHolders.pids
	if !cameraHolders.watched {
		pids = videoDeviceHolders()
	}
	cameraHolders.Unlock()

	pipeWireApps, pipeWireOK := pipeWireCaptureApps("Stream/Input/Video")

	names := make([]string, 0, len(pids)+len(pipeWireApps))
	for _, pid := range pids {
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}
		name, err := p.Name()
		if err != nil || name == "" {
			continue
		}
		// PipeWire opens the device for apps using the camera portal; those
		// apps are named from their streams below instead.
		if pipeWireOK && (name == "pipewire" || name == "wireplumber") {
			continue
		}
		if !slices.Contains(names, name) {
			names = append(names, name)
		}
	}
	for _, app := range pipeWireApps {
		if !slices.Contains(names, app) {
			names = append(names, app)
		}
	}

	if len(names) == 0 {
		return nil
	}
	return names
}

// videoDeviceHolders returns the sorted IDs of the processes with a
// /dev/video* device open. Reading every process's open files is the
// expensive part, so it's skipped when there's no video device.
func videoDeviceHolders() []int32 {
	if devices, _ := filepath.Glob(videoDevicePrefix + "*"); len(devices) == 0 {
		return nil
	}
	proc, err := os.Open("/proc")
	if err != nil {
		slog.Debug("Failed to read processes for camera usage", "error", err)
		return nil
	}
	entries, err := proc.Readdirnames(-1)
	_ = proc.Close()
	if err != nil {
		slog.Debug("Failed to read processes for camera usage", "error", err)
		return nil
	}

	var pids []int32
	self := os.Getpid()
	link := make([]byte, len(videoDevicePrefix))
	for _, entry := range entries {
		pid, err := strconv.ParseInt(entry, 10, 32)
		// System Bridge's own opens, such as reading controls over USB, would
		// otherwise trigger the update that opens the device again
		if err != nil || int(pid) == self {
			continue
		}
		if holdsVideoDevice("/proc/"+entry+"/fd", link) {
			pids = append(pids, int32(pid))
		}
	}
	slices.Sort(pids)
	return pids
}

// holdsVideoDevice reports whether any file open in the fd directory dir is
// a video device. link only needs to fit the device prefix, so reading each
// link allocates nothing.
func holdsVideoDevice(dir string, link []byte) bool {
	fds, err := os.Open(dir)
	if err != nil {
		// Other users' processes can't be read
		return false
	}
	defer func() { _ = fds.Close() }()
	names, err := fds.Readdirnames(-1)
	if err != nil {
		return false
	}
	dirfd := int(fds.Fd())
	for _, name := range names {
		n, err := unix.Readlinkat(dirfd, name, link)
		if err == nil && n == len(link) && string(link) == videoDevicePrefix {
			return true
		}
	}
	return false
}

// followCameras keeps cameraHolders current and triggers when the processes
// using a camera change. The kernel reports every open and close of a video
// device through inotify, so /proc is only read again after one.
func followCameras(ctx context.Context, trigger func()) error {
	fd, err := unix.InotifyInit1(unix.IN_CLOEXEC | unix.IN_NONBLOCK)
	if err != nil {
		return fmt.Errorf("failed to start inotify: %w", err)
	}
	// A non-blocking file reads through the runtime poller, so closing it
	// ends a read in progress
	events := os.NewFile(uintptr(fd), "inotify")
	defer func() { _ = events.Close() }()
	stopClose := context.AfterFunc(ctx, func() { _ = events.Close() })
	defer stopClose()

	if _, err := unix.InotifyAddWatch(fd, "/dev", unix.IN_CREATE|unix.IN_DELETE|unix.IN_ONLYDIR); err != nil {
		return fmt.Errorf("failed to watch /dev: %w", err)
	}
	watchDevices := func() {
		devices, _ := filepath.Glob(videoDevicePrefix + "*")
		for _, device := range devices {
			// Adding a watch twice keeps the first, so this is safe after hotplug
			if _, err := unix.InotifyAddWatch(fd, device, unix.IN_OPEN|unix.IN_CLOSE); err != nil {
				slog.Debug("Failed to watch video device", "device", device, "error", err)
			}
		}
	}
	watchDevices()

	rescan := func() {
		pids := videoDeviceHolders()
		cameraHolders.Lock()
		changed := !slices.Equal(pids, cameraHolders.pids)
		cameraHolders.pids = pids
		cameraHolders.Unlock()
		if changed {
			trigger()
		}
	}
	rescanSoon, stopRescan := watch.Debounce(cameraRescanDelay, rescan)
	defer stopRescan()

	cameraHolders.Lock()
	cameraHolders.pids = videoDeviceHolders()
	cameraHolders.watched = true
	cameraHolders.Unlock()
	defer func() {
		cameraHolders.Lock()
		cameraHolders.watched = false
		cameraHolders.Unlock()
	}()

	buf := make([]byte, 4096)
	for {
		n, err := events.Read(buf)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			if errors.Is(err, os.ErrClosed) {
				return nil
			}
			return fmt.Errorf("failed to read inotify events: %w", err)
		}
		for offset := 0; offset+unix.SizeofInotifyEvent <= n; {
			event := (*unix.InotifyEvent)(unsafe.Pointer(&buf[offset]))
			nameStart := offset + unix.SizeofInotifyEvent
			name := strings.TrimRight(string(buf[nameStart:nameStart+int(event.Len)]), "\x00")
			offset = nameStart + int(event.Len)

			switch {
			case event.Mask&unix.IN_CREATE != 0 && strings.HasPrefix(name, "video"):
				watchDevices()
				rescanSoon()
			case event.Mask&unix.IN_DELETE != 0 && strings.HasPrefix(name, "video"):
				rescanSoon()
			case event.Mask&(unix.IN_OPEN|unix.IN_CLOSE) != 0:
				rescanSoon()
			}
		}
	}
}
