//go:build linux

package cameras

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
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
	ctrlTypeCtrlClass   = 6
	ctrlTypeIntegerMenu = 9

	bufTypeVideoCapture = 1

	frmSizeTypeDiscrete = 1
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

type v4l2FmtDesc struct {
	Index       uint32
	Type        uint32
	Flags       uint32
	Description [32]byte
	PixelFormat uint32
	MbusCode    uint32
	Reserved    [3]uint32
}

// v4l2Format holds a union that's 8-byte aligned on 64-bit systems, as it
// contains pointers. A capture format is a v4l2_pix_format, which starts with
// its width, height and pixel format.
type v4l2Format struct {
	Type    uint32
	_       uint32
	RawData [200]byte
}

// v4l2FrmSizeEnum holds a discrete width and height, or a stepwise range's
// minimum width, maximum width, width step, minimum height, maximum height and
// height step
type v4l2FrmSizeEnum struct {
	Index       uint32
	PixelFormat uint32
	Type        uint32
	Size        [6]uint32
	Reserved    [2]uint32
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
	vidiocQueryCap      = ioc(iocRead, 0, unsafe.Sizeof(v4l2Capability{}))
	vidiocEnumFmt       = ioc(iocReadWrite, 2, unsafe.Sizeof(v4l2FmtDesc{}))
	vidiocGFmt          = ioc(iocReadWrite, 4, unsafe.Sizeof(v4l2Format{}))
	vidiocGCtrl         = ioc(iocReadWrite, 27, unsafe.Sizeof(v4l2Control{}))
	vidiocSCtrl         = ioc(iocReadWrite, 28, unsafe.Sizeof(v4l2Control{}))
	vidiocQueryCtrl     = ioc(iocReadWrite, 36, unsafe.Sizeof(v4l2QueryCtrl{}))
	vidiocQueryMenu     = ioc(iocReadWrite, 37, unsafe.Sizeof(v4l2QueryMenu{}))
	vidiocEnumFrameSize = ioc(iocReadWrite, 74, unsafe.Sizeof(v4l2FrmSizeEnum{}))
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

func setCtrl(fd int, id uint32, value int32) error {
	control := v4l2Control{ID: id, Value: value}
	if err := ioctl(fd, vidiocSCtrl, unsafe.Pointer(&control)); err != nil {
		return fmt.Errorf("failed to set control %#x: %w", id, err)
	}
	return nil
}

// queryMenu returns a menu item, or false for an index the menu skips
func queryMenu(fd int, id uint32, index uint32) (v4l2QueryMenu, bool) {
	query := v4l2QueryMenu{ID: id, Index: index}
	if err := ioctl(fd, vidiocQueryMenu, unsafe.Pointer(&query)); err != nil {
		return query, false
	}
	return query, true
}

// enumFmt returns the capture format at index, or false after the last
func enumFmt(fd int, index uint32) (v4l2FmtDesc, bool) {
	desc := v4l2FmtDesc{Index: index, Type: bufTypeVideoCapture}
	if err := ioctl(fd, vidiocEnumFmt, unsafe.Pointer(&desc)); err != nil {
		return desc, false
	}
	return desc, true
}

// getFmt returns the width, height and pixel format the device captures in
func getFmt(fd int) (width, height, pixelFormat uint32, err error) {
	format := v4l2Format{Type: bufTypeVideoCapture}
	if err := ioctl(fd, vidiocGFmt, unsafe.Pointer(&format)); err != nil {
		return 0, 0, 0, fmt.Errorf("failed to read format: %w", err)
	}
	return binary.NativeEndian.Uint32(format.RawData[0:4]),
		binary.NativeEndian.Uint32(format.RawData[4:8]),
		binary.NativeEndian.Uint32(format.RawData[8:12]),
		nil
}

// enumFrameSize returns the frame size at index for a pixel format, or false
// after the last. A stepwise or continuous range comes as its only entry.
func enumFrameSize(fd int, pixelFormat, index uint32) (v4l2FrmSizeEnum, bool) {
	size := v4l2FrmSizeEnum{Index: index, PixelFormat: pixelFormat}
	if err := ioctl(fd, vidiocEnumFrameSize, unsafe.Pointer(&size)); err != nil {
		return size, false
	}
	return size, true
}

// fourCC names a pixel format by its four character code, such as MJPG
func fourCC(pixelFormat uint32) string {
	var code [4]byte
	binary.LittleEndian.PutUint32(code[:], pixelFormat)
	return strings.TrimRight(string(code[:]), " \x00")
}

// cString returns the text of a NUL terminated C string field
func cString(b []byte) string {
	if i := bytes.IndexByte(b, 0); i >= 0 {
		b = b[:i]
	}
	return string(b)
}
