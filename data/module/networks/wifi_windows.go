//go:build windows

package networks

import (
	"log/slog"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"

	"github.com/timmo001/system-bridge/types"
)

var (
	modWlanapi             = windows.NewLazySystemDLL("wlanapi.dll")
	procWlanOpenHandle     = modWlanapi.NewProc("WlanOpenHandle")
	procWlanCloseHandle    = modWlanapi.NewProc("WlanCloseHandle")
	procWlanEnumInterfaces = modWlanapi.NewProc("WlanEnumInterfaces")
	procWlanQueryInterface = modWlanapi.NewProc("WlanQueryInterface")
	procWlanFreeMemory     = modWlanapi.NewProc("WlanFreeMemory")
)

const (
	wlanClientVersion      = 2
	wlanInterfaceStateConn = 1
	wlanOpcodeCurrentConn  = 7
	wlanOpcodeRSSI         = 0x10000102
	wlanInterfaceInfoSize  = 532 // WLAN_INTERFACE_INFO
)

// wlanInterfaceInfoList is the WLAN_INTERFACE_INFO_LIST header. The
// WLAN_INTERFACE_INFO entries follow it.
type wlanInterfaceInfoList struct {
	numberOfItems uint32
	index         uint32
}

// wlanConnectionAttributes is WLAN_CONNECTION_ATTRIBUTES up to the transmit
// rate in its association attributes
type wlanConnectionAttributes struct {
	state          uint32
	connectionMode uint32
	profileName    [256]uint16
	ssidLength     uint32
	ssid           [32]byte
	bssType        uint32
	bssid          [6]byte
	_              [2]byte
	phyType        uint32
	phyIndex       uint32
	signalQuality  uint32
	rxRate         uint32
	txRate         uint32
}

// wifiInterfaces reads each wireless interface's connection from the WLAN
// API, keyed by interface name. It returns nil where the WLAN service isn't
// running, such as on systems without Wi-Fi.
func wifiInterfaces() map[string]*types.NetworkWifi {
	if procWlanOpenHandle.Find() != nil {
		return nil
	}

	var negotiated uint32
	var handle windows.Handle
	if ret, _, _ := procWlanOpenHandle.Call(
		uintptr(wlanClientVersion),
		0,
		uintptr(unsafe.Pointer(&negotiated)),
		uintptr(unsafe.Pointer(&handle)),
	); ret != 0 {
		slog.Debug("WLAN API not available", "error", windows.Errno(ret))
		return nil
	}
	defer func() { _, _, _ = procWlanCloseHandle.Call(uintptr(handle), 0) }()

	var list *wlanInterfaceInfoList
	if ret, _, _ := procWlanEnumInterfaces.Call(
		uintptr(handle),
		0,
		uintptr(unsafe.Pointer(&list)),
	); ret != 0 || list == nil {
		slog.Debug("Error listing wireless interfaces", "error", windows.Errno(ret))
		return nil
	}
	defer func() { _, _, _ = procWlanFreeMemory.Call(uintptr(unsafe.Pointer(list))) }()

	names := adapterNames()
	result := make(map[string]*types.NetworkWifi, list.numberOfItems)
	entries := unsafe.Add(unsafe.Pointer(list), unsafe.Sizeof(*list))
	for i := range list.numberOfItems {
		entry := unsafe.Add(entries, uintptr(i)*wlanInterfaceInfoSize)
		guid := (*windows.GUID)(entry)
		name, ok := names[strings.ToUpper(guid.String())]
		if !ok {
			continue
		}
		result[name] = wlanConnection(handle, guid)
	}
	return result
}

func wlanConnection(handle windows.Handle, guid *windows.GUID) *types.NetworkWifi {
	info := &types.NetworkWifi{}

	var size uint32
	var attrs *wlanConnectionAttributes
	if ret, _, _ := procWlanQueryInterface.Call(
		uintptr(handle),
		uintptr(unsafe.Pointer(guid)),
		uintptr(wlanOpcodeCurrentConn),
		0,
		uintptr(unsafe.Pointer(&size)),
		uintptr(unsafe.Pointer(&attrs)),
		0,
	); ret != 0 || attrs == nil {
		// Fails with ERROR_INVALID_STATE while the interface isn't connected
		return info
	}
	defer func() { _, _, _ = procWlanFreeMemory.Call(uintptr(unsafe.Pointer(attrs))) }()

	if size < uint32(unsafe.Sizeof(*attrs)) || attrs.state != wlanInterfaceStateConn {
		return info
	}
	ssid := string(attrs.ssid[:min(attrs.ssidLength, uint32(len(attrs.ssid)))])
	info.SSID = &ssid
	percent := int(attrs.signalQuality)
	info.SignalPercent = &percent
	if attrs.txRate > 0 {
		rate := float64(attrs.txRate) / 1000
		info.LinkRate = &rate
	}

	var rssiSize uint32
	var rssi *int32
	if ret, _, _ := procWlanQueryInterface.Call(
		uintptr(handle),
		uintptr(unsafe.Pointer(guid)),
		uintptr(wlanOpcodeRSSI),
		0,
		uintptr(unsafe.Pointer(&rssiSize)),
		uintptr(unsafe.Pointer(&rssi)),
		0,
	); ret == 0 && rssi != nil {
		defer func() { _, _, _ = procWlanFreeMemory.Call(uintptr(unsafe.Pointer(rssi))) }()
		if rssiSize >= 4 {
			signal := int(*rssi)
			info.Signal = &signal
		}
	}
	return info
}

// adapterNames maps adapter GUIDs, as "{XXXXXXXX-...}", to the friendly names
// net.Interfaces uses on Windows
func adapterNames() map[string]string {
	size := uint32(15 * 1024)
	for range 3 {
		buf := make([]byte, size)
		first := (*windows.IpAdapterAddresses)(unsafe.Pointer(&buf[0]))
		err := windows.GetAdaptersAddresses(windows.AF_UNSPEC, windows.GAA_FLAG_INCLUDE_PREFIX, 0, first, &size)
		if err == windows.ERROR_BUFFER_OVERFLOW {
			continue
		}
		if err != nil {
			slog.Debug("Error listing network adapters", "error", err)
			return nil
		}
		names := make(map[string]string)
		for adapter := first; adapter != nil; adapter = adapter.Next {
			guid := strings.ToUpper(windows.BytePtrToString(adapter.AdapterName))
			names[guid] = windows.UTF16PtrToString(adapter.FriendlyName)
		}
		return names
	}
	return nil
}
