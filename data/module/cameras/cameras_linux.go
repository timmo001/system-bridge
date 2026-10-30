//go:build linux

package cameras

import (
	"cmp"
	"context"
	"encoding/binary"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"golang.org/x/sys/unix"

	"github.com/timmo001/system-bridge/types"
)

// byIDDir holds udev's links to each video device, named from the device's
// USB or PCI identity, so they stay the same when it's plugged in again
const byIDDir = "/dev/v4l/by-id"

// GetCamerasData lists the video capture devices V4L2 knows about, with their
// controls. Metadata and output nodes are left out.
func GetCamerasData(ctx context.Context) (types.CamerasData, error) {
	data := types.CamerasData{Cameras: []types.Camera{}}

	devices, err := filepath.Glob("/dev/video*")
	if err != nil {
		return data, fmt.Errorf("failed to list video devices: %w", err)
	}
	ids := byIDLinks()

	for _, device := range devices {
		if err := ctx.Err(); err != nil {
			return data, err
		}
		camera, ok, err := readCamera(device)
		if err != nil {
			slog.Debug("Failed to read video device", "device", device, "error", err)
			continue
		}
		if !ok {
			continue
		}
		if id, ok := ids[device]; ok {
			camera.ID = id
		}
		data.Cameras = append(data.Cameras, camera)
	}

	slices.SortFunc(data.Cameras, func(a, b types.Camera) int {
		return cmp.Or(
			strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name)),
			strings.Compare(a.Device, b.Device),
		)
	})
	return data, nil
}

// byIDLinks maps each video device to the name of its link in byIDDir
func byIDLinks() map[string]string {
	ids := make(map[string]string)
	entries, err := os.ReadDir(byIDDir)
	if err != nil {
		return ids
	}
	for _, entry := range entries {
		target, err := filepath.EvalSymlinks(filepath.Join(byIDDir, entry.Name()))
		if err != nil {
			continue
		}
		ids[target] = entry.Name()
	}
	return ids
}

// readCamera reads a video device's name and controls, or returns false when
// it doesn't capture video
func readCamera(device string) (types.Camera, bool, error) {
	// Opening a device another app is streaming from is fine, as long as this
	// doesn't stream itself
	fd, err := unix.Open(device, unix.O_RDWR|unix.O_NONBLOCK|unix.O_CLOEXEC, 0)
	if err != nil {
		return types.Camera{}, false, fmt.Errorf("failed to open: %w", err)
	}
	defer func() { _ = unix.Close(fd) }()

	capability, err := queryCap(fd)
	if err != nil {
		return types.Camera{}, false, err
	}
	if !capability.capturesVideo() {
		return types.Camera{}, false, nil
	}

	formats, sizes := readFormats(fd)
	camera := types.Camera{
		ID:       filepath.Base(device),
		Name:     cString(capability.Card[:]),
		Device:   device,
		Format:   currentFormat(fd, formats),
		Formats:  formats,
		Sizes:    sizes,
		Controls: readControls(fd),
	}
	if driver := cString(capability.Driver[:]); driver != "" {
		camera.Driver = &driver
	}
	return camera, true, nil
}

// readFormats lists the pixel formats a device captures in, each at its
// largest frame size, and every frame size across them, largest first. A
// format with a range of sizes adds only its largest.
func readFormats(fd int) ([]types.CameraFormat, []types.CameraSize) {
	formats := []types.CameraFormat{}
	sizes := []types.CameraSize{}
	for index := uint32(0); ; index++ {
		desc, ok := enumFmt(fd, index)
		if !ok {
			break
		}
		format := types.CameraFormat{
			Format: fourCC(desc.PixelFormat),
			Name:   cString(desc.Description[:]),
		}
		for sizeIndex := uint32(0); ; sizeIndex++ {
			size, ok := enumFrameSize(fd, desc.PixelFormat, sizeIndex)
			if !ok {
				break
			}
			width, height := size.Size[0], size.Size[1]
			if size.Type != frmSizeTypeDiscrete {
				// A range's maximum width and height
				width, height = size.Size[1], size.Size[4]
			}
			if int64(width)*int64(height) > format.Width*format.Height {
				format.Width, format.Height = int64(width), int64(height)
			}
			if frame := (types.CameraSize{Width: int64(width), Height: int64(height)}); !slices.Contains(sizes, frame) {
				sizes = append(sizes, frame)
			}
			if size.Type != frmSizeTypeDiscrete {
				break
			}
		}
		formats = append(formats, format)
	}
	slices.SortFunc(sizes, func(a, b types.CameraSize) int {
		return cmp.Or(cmp.Compare(b.Width*b.Height, a.Width*a.Height), cmp.Compare(b.Width, a.Width))
	})
	return formats, sizes
}

// currentFormat reads the format and size a device captures in, named from
// its supported formats
func currentFormat(fd int, formats []types.CameraFormat) *types.CameraFormat {
	width, height, pixelFormat, err := getFmt(fd)
	if err != nil {
		slog.Debug("Failed to read camera format", "error", err)
		return nil
	}
	format := types.CameraFormat{
		Format: fourCC(pixelFormat),
		Width:  int64(width),
		Height: int64(height),
	}
	for _, supported := range formats {
		if supported.Format == format.Format {
			format.Name = supported.Name
			break
		}
	}
	return &format
}

// readControls reads the integer, boolean and menu controls of a device, each
// in the group of the class it comes after. Others, such as buttons, are left
// out.
func readControls(fd int) []types.CameraControl {
	controls := []types.CameraControl{}
	group := ""
	for id := uint32(0); ; {
		query, ok, err := nextCtrl(fd, id)
		if err != nil {
			slog.Debug("Failed to list camera controls", "error", err)
			break
		}
		if !ok {
			break
		}
		id = query.ID

		// A class, such as User Controls, comes before its controls
		if query.Type == ctrlTypeCtrlClass {
			group = cString(query.Name[:])
			continue
		}
		if query.Flags&(ctrlFlagDisabled|ctrlFlagWriteOnly) != 0 {
			continue
		}
		var controlType types.CameraControlType
		switch query.Type {
		case ctrlTypeInteger:
			controlType = types.CameraControlTypeInteger
		case ctrlTypeBoolean:
			controlType = types.CameraControlTypeBoolean
		case ctrlTypeMenu, ctrlTypeIntegerMenu:
			controlType = types.CameraControlTypeMenu
		default:
			continue
		}

		value, err := getCtrl(fd, query.ID)
		if err != nil {
			slog.Debug("Failed to read camera control", "control", cString(query.Name[:]), "error", err)
			continue
		}
		name := cString(query.Name[:])
		control := types.CameraControl{
			ID:       controlID(name),
			Name:     name,
			Group:    group,
			Type:     controlType,
			Value:    int64(value),
			Minimum:  int64(query.Minimum),
			Maximum:  int64(query.Maximum),
			Step:     int64(query.Step),
			Default:  int64(query.DefaultValue),
			Options:  []types.CameraControlOption{},
			Inactive: query.Flags&ctrlFlagInactive != 0,
			ReadOnly: query.Flags&ctrlFlagReadOnly != 0,
		}
		if controlType == types.CameraControlTypeMenu && query.Minimum >= 0 {
			control.Options = menuOptions(fd, query)
		}
		controls = append(controls, control)
	}
	return controls
}

// menuOptions lists the choices of a menu control. An integer menu's choices
// are named from their values.
func menuOptions(fd int, query v4l2QueryCtrl) []types.CameraControlOption {
	options := []types.CameraControlOption{}
	for index := uint32(query.Minimum); index <= uint32(query.Maximum); index++ {
		item, ok := queryMenu(fd, query.ID, index)
		if !ok {
			continue
		}
		name := cString(item.Name[:])
		if query.Type == ctrlTypeIntegerMenu {
			name = fmt.Sprint(int64(binary.NativeEndian.Uint64(item.Name[:8])))
		}
		options = append(options, types.CameraControlOption{Value: int64(index), Name: name})
	}
	return options
}

// controlID names a control the way v4l2-ctl does, so "White Balance,
// Automatic" is white_balance_automatic
func controlID(name string) string {
	var id strings.Builder
	for _, r := range strings.ToLower(name) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			id.WriteRune(r)
		case id.Len() > 0 && !strings.HasSuffix(id.String(), "_"):
			id.WriteByte('_')
		}
	}
	return strings.TrimSuffix(id.String(), "_")
}
