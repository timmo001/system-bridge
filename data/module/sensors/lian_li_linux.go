//go:build linux

package sensors

import (
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"unsafe"

	"golang.org/x/sys/unix"

	"github.com/timmo001/system-bridge/types"
)

const (
	lianLiVendorID        = 0x0cf2
	lianLiFanChannelCount = 4
	lianLiReportID        = 224
	lianLiReportLength    = 65

	ioctlRead      = 2
	ioctlWrite     = 1
	ioctlNrShift   = 0
	ioctlTypeShift = 8
	ioctlSizeShift = 16
	ioctlDirShift  = 30
)

type lianLiUniDeviceInfo struct {
	ProductID    uint16
	Description  string
	ReportOffset int
}

type lianLiUniDevice struct {
	Info       lianLiUniDeviceInfo
	DevicePath string
	InstanceID string
}

var lianLiUniDevices = map[uint16]lianLiUniDeviceInfo{
	0x7750: {ProductID: 0x7750, Description: "Lian Li Uni SL", ReportOffset: 1},
	0xa100: {ProductID: 0xa100, Description: "Lian Li Uni SL", ReportOffset: 1},
	0xa101: {ProductID: 0xa101, Description: "Lian Li Uni AL", ReportOffset: 1},
	0xa102: {ProductID: 0xa102, Description: "Lian Li Uni SL-Infinity", ReportOffset: 1},
	0xa103: {ProductID: 0xa103, Description: "Lian Li Uni SL V2", ReportOffset: 2},
	0xa104: {ProductID: 0xa104, Description: "Lian Li Uni AL V2", ReportOffset: 2},
	0xa105: {ProductID: 0xa105, Description: "Lian Li Uni SL V2", ReportOffset: 2},
}

func getLianLiUniFansData() []types.Fan {
	devices := findLianLiUniDevices("/sys/class/hidraw")
	fans := make([]types.Fan, 0, len(devices)*lianLiFanChannelCount)

	for _, device := range devices {
		speeds, err := readLianLiUniFanSpeeds(device)
		if err != nil {
			continue
		}

		for channel, speed := range speeds {
			channelNumber := channel + 1
			rpm := float64(speed)
			label := fmt.Sprintf("fan%d", channelNumber)
			fans = append(fans, types.Fan{
				SensorKey: lianLiFanKey(device, channelNumber),
				Name:      fmt.Sprintf("%s Fan %d", device.Info.Description, channelNumber),
				Label:     label,
				SpeedRPM:  &rpm,
			})
		}
	}

	return fans
}

func findLianLiUniDevices(hidrawClassPath string) []lianLiUniDevice {
	hidrawDirs, err := filepath.Glob(filepath.Join(hidrawClassPath, "hidraw*"))
	if err != nil {
		return nil
	}
	sort.Strings(hidrawDirs)

	devices := make([]lianLiUniDevice, 0)
	for _, hidrawDir := range hidrawDirs {
		ueventPath := filepath.Join(hidrawDir, "device", "uevent")
		data, err := os.ReadFile(ueventPath)
		if err != nil {
			continue
		}

		vendorID, productID, details, ok := parseHIDUEvent(string(data))
		if !ok || vendorID != lianLiVendorID {
			continue
		}

		info, ok := lianLiUniDevices[productID]
		if !ok {
			continue
		}

		devices = append(devices, lianLiUniDevice{
			Info:       info,
			DevicePath: filepath.Join("/dev", filepath.Base(hidrawDir)),
			InstanceID: lianLiInstanceID(details, hidrawDir),
		})
	}

	return devices
}

func readLianLiUniFanSpeeds(device lianLiUniDevice) ([]uint16, error) {
	file, err := os.OpenFile(device.DevicePath, os.O_RDONLY, 0)
	if err != nil {
		return nil, fmt.Errorf("open Lian Li UNI hidraw device: %w", err)
	}
	defer func() {
		_ = file.Close()
	}()

	report, err := hidrawGetInputReport(file, lianLiReportID, lianLiReportLength)
	if err != nil {
		return nil, fmt.Errorf("read Lian Li UNI input report: %w", err)
	}

	return decodeLianLiUniFanSpeeds(report, device.Info.ReportOffset)
}

func hidrawGetInputReport(file *os.File, reportID byte, length int) ([]byte, error) {
	if length <= 0 {
		return nil, fmt.Errorf("invalid report length %d", length)
	}

	report := make([]byte, length)
	report[0] = reportID

	_, _, errno := unix.Syscall(
		unix.SYS_IOCTL,
		file.Fd(),
		uintptr(hidIOCGInput(length)),
		uintptr(unsafe.Pointer(&report[0])),
	)
	if errno != 0 {
		return nil, errno
	}

	return report, nil
}

func hidIOCGInput(length int) uint {
	return uint(((ioctlRead | ioctlWrite) << ioctlDirShift) |
		(length << ioctlSizeShift) |
		(int('H') << ioctlTypeShift) |
		(0x0a << ioctlNrShift))
}

func decodeLianLiUniFanSpeeds(report []byte, offset int) ([]uint16, error) {
	lastByte := offset + lianLiFanChannelCount*2
	if len(report) < lastByte {
		return nil, fmt.Errorf("report too short: got %d bytes, need %d", len(report), lastByte)
	}

	speeds := make([]uint16, 0, lianLiFanChannelCount)
	for channel := 0; channel < lianLiFanChannelCount; channel++ {
		start := offset + channel*2
		speeds = append(speeds, binary.BigEndian.Uint16(report[start:start+2]))
	}

	return speeds, nil
}

func parseHIDUEvent(data string) (uint16, uint16, map[string]string, bool) {
	details := make(map[string]string)
	for line := range strings.SplitSeq(data, "\n") {
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		details[key] = value
	}

	vendorID, productID, ok := parseHIDID(details["HID_ID"])
	return vendorID, productID, details, ok
}

func parseHIDID(id string) (uint16, uint16, bool) {
	parts := strings.Split(id, ":")
	if len(parts) != 3 {
		return 0, 0, false
	}

	vendorID, err := strconv.ParseUint(parts[1], 16, 16)
	if err != nil {
		return 0, 0, false
	}
	productID, err := strconv.ParseUint(parts[2], 16, 16)
	if err != nil {
		return 0, 0, false
	}

	return uint16(vendorID), uint16(productID), true
}

func lianLiInstanceID(details map[string]string, hidrawDir string) string {
	for _, key := range []string{"HID_UNIQ", "HID_PHYS"} {
		if value := details[key]; value != "" {
			return shortHash(value)
		}
	}

	if realPath, err := filepath.EvalSymlinks(hidrawDir); err == nil {
		return shortHash(realPath)
	}

	return shortHash(hidrawDir)
}

func lianLiFanKey(device lianLiUniDevice, channel int) string {
	return fmt.Sprintf("%s_%s_fan%d", sanitizeLianLiKey(device.Info.Description), device.InstanceID, channel)
}

func sanitizeLianLiKey(value string) string {
	var builder strings.Builder
	lastUnderscore := false

	for _, char := range strings.ToLower(value) {
		if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') {
			builder.WriteRune(char)
			lastUnderscore = false
			continue
		}

		if !lastUnderscore {
			builder.WriteByte('_')
			lastUnderscore = true
		}
	}

	return strings.Trim(builder.String(), "_")
}

func shortHash(value string) string {
	hash := fnv.New32a()
	_, _ = hash.Write([]byte(value))
	return fmt.Sprintf("%08x", hash.Sum32())
}
