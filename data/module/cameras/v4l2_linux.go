//go:build linux

package cameras

import (
	"bytes"
	"errors"
	"fmt"
	"unsafe"

	"golang.org/x/sys/unix"
)

// The V4L2 structs and ioctls used here, from linux/videodev2.h

const (
	capVideoCapture = 0x00000001
	capDeviceCaps   = 0x80000000

	ctrlFlagDisabled  = 0x0001
	ctrlFlagReadOnly  = 0x0004
	ctrlFlagInactive  = 0x0010
	ctrlFlagWriteOnly = 0x0040
	ctrlFlagNextCtrl  = 0x80000000

	ctrlTypeInteger     = 1
	ctrlTypeBoolean     = 2
	ctrlTypeMenu        = 3
	ctrlTypeIntegerMenu = 9
)

type v4l2Capability struct {
	Driver       [16]byte
	Card         [32]byte
	BusInfo      [32]byte
	Version      uint32
	Capabilities uint32
	DeviceCaps   uint32
	Reserved     [3]uint32
}

type v4l2QueryCtrl struct {
	ID           uint32
	Type         uint32
	Name         [32]byte
	Minimum      int32
	Maximum      int32
	Step         int32
	DefaultValue int32
	Flags        uint32
	Reserved     [2]uint32
}

// v4l2QueryMenu is packed in C. Name holds the name of a menu item, or the
// int64 value of an integer menu item in its first 8 bytes.
type v4l2QueryMenu struct {
	ID       uint32
	Index    uint32
	Name     [32]byte
	Reserved uint32
}

type v4l2Control struct {
	ID    uint32
	Value int32
}

// ioctl request numbers, as the kernel's _IOR and _IOWR macros build them
func ioc(dir, nr, size uintptr) uintptr {
	return dir<<30 | size<<16 | 'V'<<8 | nr
}

const (
	iocRead      = 2
	iocReadWrite = 3
)

var (
	vidiocQueryCap  = ioc(iocRead, 0, unsafe.Sizeof(v4l2Capability{}))
	vidiocGCtrl     = ioc(iocReadWrite, 27, unsafe.Sizeof(v4l2Control{}))
	vidiocQueryCtrl = ioc(iocReadWrite, 36, unsafe.Sizeof(v4l2QueryCtrl{}))
	vidiocQueryMenu = ioc(iocReadWrite, 37, unsafe.Sizeof(v4l2QueryMenu{}))
)

func ioctl(fd int, request uintptr, arg unsafe.Pointer) error {
	for {
		_, _, errno := unix.Syscall(unix.SYS_IOCTL, uintptr(fd), request, uintptr(arg))
		switch errno {
		case 0:
			return nil
		case unix.EINTR:
			continue
		default:
			return errno
		}
	}
}

func queryCap(fd int) (v4l2Capability, error) {
	var capability v4l2Capability
	if err := ioctl(fd, vidiocQueryCap, unsafe.Pointer(&capability)); err != nil {
		return capability, fmt.Errorf("failed to query capabilities: %w", err)
	}
	return capability, nil
}

// capturesVideo reports whether the device node itself captures video, rather
// than only the physical device it belongs to, such as a UVC metadata node
func (c v4l2Capability) capturesVideo() bool {
	caps := c.Capabilities
	if caps&capDeviceCaps != 0 {
		caps = c.DeviceCaps
	}
	return caps&capVideoCapture != 0
}

// nextCtrl returns the control after id, or false after the last
func nextCtrl(fd int, id uint32) (v4l2QueryCtrl, bool, error) {
	query := v4l2QueryCtrl{ID: id | ctrlFlagNextCtrl}
	err := ioctl(fd, vidiocQueryCtrl, unsafe.Pointer(&query))
	if errors.Is(err, unix.EINVAL) {
		return query, false, nil
	}
	if err != nil {
		return query, false, fmt.Errorf("failed to query control: %w", err)
	}
	return query, true, nil
}

func getCtrl(fd int, id uint32) (int32, error) {
	control := v4l2Control{ID: id}
	if err := ioctl(fd, vidiocGCtrl, unsafe.Pointer(&control)); err != nil {
		return 0, fmt.Errorf("failed to read control %#x: %w", id, err)
	}
	return control.Value, nil
}

// queryMenu returns a menu item, or false for an index the menu skips
func queryMenu(fd int, id uint32, index uint32) (v4l2QueryMenu, bool) {
	query := v4l2QueryMenu{ID: id, Index: index}
	if err := ioctl(fd, vidiocQueryMenu, unsafe.Pointer(&query)); err != nil {
		return query, false
	}
	return query, true
}

// cString returns the text of a NUL terminated C string field
func cString(b []byte) string {
	if i := bytes.IndexByte(b, 0); i >= 0 {
		b = b[:i]
	}
	return string(b)
}
