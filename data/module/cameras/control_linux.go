//go:build linux

package cameras

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/unix"
)

// SetControl sets one of a camera's controls, such as its brightness or zoom.
// camera is the camera's id and control the control's, both from the cameras
// module. This works while another app is using the camera.
func SetControl(ctx context.Context, camera string, control string, value int64) error {
	device, err := cameraDevice(camera)
	if err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	fd, err := unix.Open(device, unix.O_RDWR|unix.O_NONBLOCK|unix.O_CLOEXEC, 0)
	if err != nil {
		return fmt.Errorf("failed to open %s: %w", device, err)
	}
	defer func() { _ = unix.Close(fd) }()

	query, err := findControl(fd, control)
	if err != nil {
		return err
	}
	name := cString(query.Name[:])
	if query.Flags&ctrlFlagReadOnly != 0 {
		return fmt.Errorf("%w: %s can only be read", ErrInvalidValue, name)
	}
	if value < int64(query.Minimum) || value > int64(query.Maximum) {
		return fmt.Errorf("%w: %s must be between %d and %d", ErrInvalidValue, name, query.Minimum, query.Maximum)
	}
	if query.Step > 1 && (value-int64(query.Minimum))%int64(query.Step) != 0 {
		return fmt.Errorf("%w: %s goes up in steps of %d from %d", ErrInvalidValue, name, query.Step, query.Minimum)
	}
	if query.Type == ctrlTypeMenu || query.Type == ctrlTypeIntegerMenu {
		if _, ok := queryMenu(fd, query.ID, uint32(value)); !ok {
			return fmt.Errorf("%w: %d isn't one of the choices of %s", ErrInvalidValue, value, name)
		}
	}

	if err := setCtrl(fd, query.ID, int32(value)); err != nil {
		switch {
		// UVC refuses a control another one overrides, such as focus while
		// autofocus is on
		case errors.Is(err, unix.EACCES) && query.Flags&ctrlFlagInactive != 0:
			return fmt.Errorf("%w: %s is set automatically by another control, so turn that off first", ErrInvalidValue, name)
		case errors.Is(err, unix.EINVAL), errors.Is(err, unix.ERANGE), errors.Is(err, unix.EACCES):
			return fmt.Errorf("%w: %s can't be set to %d: %v", ErrInvalidValue, name, value, err)
		}
		return err
	}
	return nil
}

// cameraDevice returns the device node of a camera id, which is its name in
// byIDDir or, without one, its device name, such as video0
func cameraDevice(id string) (string, error) {
	if id == "" || id == "." || id == ".." || strings.Contains(id, "/") {
		return "", ErrNotFound
	}
	if device, err := filepath.EvalSymlinks(filepath.Join(byIDDir, id)); err == nil {
		return device, nil
	}
	if strings.HasPrefix(id, "video") {
		device := "/dev/" + id
		if _, err := os.Stat(device); err == nil {
			return device, nil
		}
	}
	return "", ErrNotFound
}

// findControl returns the control whose id, as the cameras module names it,
// is id
func findControl(fd int, id string) (v4l2QueryCtrl, error) {
	for next := uint32(0); ; {
		query, ok, err := nextCtrl(fd, next)
		if err != nil {
			return query, err
		}
		if !ok {
			return query, fmt.Errorf("%w: the camera has no control %s", ErrNotFound, id)
		}
		next = query.ID
		if query.Flags&ctrlFlagDisabled == 0 && controlID(cString(query.Name[:])) == id {
			return query, nil
		}
	}
}
