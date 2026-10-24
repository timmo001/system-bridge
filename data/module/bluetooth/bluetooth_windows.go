//go:build windows

package bluetooth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"

	"github.com/timmo001/system-bridge/types"
)

var (
	modBthprops                  = windows.NewLazySystemDLL("bthprops.cpl")
	procBluetoothFindFirstDevice = modBthprops.NewProc("BluetoothFindFirstDevice")
	procBluetoothFindNextDevice  = modBthprops.NewProc("BluetoothFindNextDevice")
	procBluetoothFindDeviceClose = modBthprops.NewProc("BluetoothFindDeviceClose")
)

// deviceSearchParams is BLUETOOTH_DEVICE_SEARCH_PARAMS
type deviceSearchParams struct {
	size                uint32
	returnAuthenticated int32
	returnRemembered    int32
	returnUnknown       int32
	returnConnected     int32
	issueInquiry        int32
	timeoutMultiplier   uint8
	radio               windows.Handle
}

// deviceInfo is BLUETOOTH_DEVICE_INFO
type deviceInfo struct {
	size          uint32
	address       uint64
	classOfDevice uint32
	connected     int32
	remembered    int32
	authenticated int32
	lastSeen      windows.Systemtime
	lastUsed      windows.Systemtime
	name          [248]uint16
}

func newDeviceInfo() deviceInfo {
	info := deviceInfo{}
	info.size = uint32(unsafe.Sizeof(info))
	return info
}

// GetBluetoothData lists the paired devices on every radio, from what Windows
// remembers rather than a new search. This API only lists classic Bluetooth
// devices, so Bluetooth LE devices aren't included.
func GetBluetoothData(context.Context) (types.BluetoothData, error) {
	devices := make([]types.BluetoothDevice, 0)
	if err := procBluetoothFindFirstDevice.Find(); err != nil {
		return types.BluetoothData{Devices: devices}, nil
	}

	params := deviceSearchParams{
		returnAuthenticated: 1,
		returnRemembered:    1,
		returnConnected:     1,
	}
	params.size = uint32(unsafe.Sizeof(params))
	info := newDeviceInfo()

	find, _, err := procBluetoothFindFirstDevice.Call(uintptr(unsafe.Pointer(&params)), uintptr(unsafe.Pointer(&info)))
	if find == 0 {
		if errors.Is(err, windows.ERROR_NO_MORE_ITEMS) {
			return types.BluetoothData{Devices: devices}, nil
		}
		return types.BluetoothData{}, fmt.Errorf("BluetoothFindFirstDevice failed: %w", err)
	}
	defer func() { _, _, _ = procBluetoothFindDeviceClose.Call(find) }()

	for {
		if info.authenticated != 0 || info.remembered != 0 {
			devices = append(devices, toDevice(info))
		}
		info = newDeviceInfo()
		if ok, _, _ := procBluetoothFindNextDevice.Call(find, uintptr(unsafe.Pointer(&info))); ok == 0 {
			break
		}
	}
	sortDevices(devices)
	return types.BluetoothData{Devices: devices}, nil
}

func toDevice(info deviceInfo) types.BluetoothDevice {
	octets := make([]string, 6)
	for i := range octets {
		octets[i] = fmt.Sprintf("%02X", byte(info.address>>(8*(5-i))))
	}
	device := types.BluetoothDevice{
		Address:   strings.Join(octets, ":"),
		Name:      windows.UTF16ToString(info.name[:]),
		Connected: info.connected != 0,
	}
	if device.Name == "" {
		device.Name = device.Address
	}
	if icon := classIcon(info.classOfDevice); icon != "" {
		device.Type = &icon
	}
	return device
}

// classIcon names a device's freedesktop icon from its class of device, the
// way BlueZ does, so both platforms report the same types
func classIcon(class uint32) string {
	minor := (class & 0xfc) >> 2
	switch (class & 0x1f00) >> 8 {
	case 0x01:
		return "computer"
	case 0x02:
		if minor == 0x04 {
			return "modem"
		}
		return "phone"
	case 0x03:
		return "network-wireless"
	case 0x04:
		switch minor {
		case 0x01, 0x02:
			return "audio-headset"
		case 0x06:
			return "audio-headphones"
		case 0x0b, 0x0c, 0x0d:
			return "camera-video"
		default:
			return "audio-card"
		}
	case 0x05:
		switch (class & 0xc0) >> 6 {
		case 0x00:
			if kind := (class & 0x1e) >> 2; kind == 0x01 || kind == 0x02 {
				return "input-gaming"
			}
		case 0x01:
			return "input-keyboard"
		case 0x02:
			if (class&0x1e)>>2 == 0x05 {
				return "input-tablet"
			}
			return "input-mouse"
		}
	case 0x06:
		if class&0x80 != 0 {
			return "printer"
		}
		if class&0x20 != 0 {
			return "camera-photo"
		}
	}
	return ""
}
