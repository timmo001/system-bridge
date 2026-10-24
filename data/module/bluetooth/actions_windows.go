//go:build windows

package bluetooth

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

var procBluetoothRemoveDevice = modBthprops.NewProc("BluetoothRemoveDevice")

// Connect isn't supported on Windows, which has no Win32 API for it
func Connect(context.Context, string) error {
	return fmt.Errorf("%w: connecting a device", ErrUnsupported)
}

// Disconnect isn't supported on Windows, which has no Win32 API for it
func Disconnect(context.Context, string) error {
	return fmt.Errorf("%w: disconnecting a device", ErrUnsupported)
}

// Forget unpairs a device, so it has to be paired again to connect
func Forget(_ context.Context, address string) error {
	value, err := parseAddress(address)
	if err != nil {
		return err
	}
	if err := procBluetoothRemoveDevice.Find(); err != nil {
		return fmt.Errorf("%w: forgetting a device", ErrUnsupported)
	}
	result, _, _ := procBluetoothRemoveDevice.Call(uintptr(unsafe.Pointer(&value)))
	switch windows.Errno(result) {
	case windows.ERROR_SUCCESS:
		return nil
	case windows.ERROR_NOT_FOUND:
		return fmt.Errorf("%w: %s", ErrNotFound, address)
	default:
		return fmt.Errorf("failed to forget %s: %w", address, windows.Errno(result))
	}
}

// SetPowered isn't supported on Windows, which has no Win32 API for it
func SetPowered(context.Context, bool) error {
	return fmt.Errorf("%w: turning the adapter on or off", ErrUnsupported)
}

// parseAddress reads an address like 80:C3:BA:7B:93:4E as BLUETOOTH_ADDRESS
func parseAddress(address string) (uint64, error) {
	octets := strings.Split(address, ":")
	if len(octets) != 6 {
		return 0, fmt.Errorf("%w: %s", ErrNotFound, address)
	}
	var value uint64
	for _, octet := range octets {
		part, err := strconv.ParseUint(octet, 16, 8)
		if err != nil {
			return 0, fmt.Errorf("%w: %s", ErrNotFound, address)
		}
		value = value<<8 | part
	}
	return value, nil
}
