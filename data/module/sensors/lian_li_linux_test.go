//go:build linux

package sensors

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseHIDID(t *testing.T) {
	tests := []struct {
		name        string
		id          string
		wantVendor  uint16
		wantProduct uint16
		wantOK      bool
	}{
		{
			name:        "Linux hidraw uevent ID",
			id:          "0003:00000CF2:0000A104",
			wantVendor:  lianLiVendorID,
			wantProduct: 0xa104,
			wantOK:      true,
		},
		{
			name:   "missing product",
			id:     "0003:00000CF2",
			wantOK: false,
		},
		{
			name:   "invalid hex",
			id:     "0003:00000CF2:not-hex",
			wantOK: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vendorID, productID, ok := parseHIDID(tt.id)
			if ok != tt.wantOK {
				t.Fatalf("ok = %v, want %v", ok, tt.wantOK)
			}
			if vendorID != tt.wantVendor {
				t.Fatalf("vendorID = %#x, want %#x", vendorID, tt.wantVendor)
			}
			if productID != tt.wantProduct {
				t.Fatalf("productID = %#x, want %#x", productID, tt.wantProduct)
			}
		})
	}
}

func TestDecodeLianLiUniFanSpeeds(t *testing.T) {
	tests := []struct {
		name   string
		offset int
		want   []uint16
	}{
		{
			name:   "first generation offset",
			offset: 1,
			want:   []uint16{1995, 0, 705, 1275},
		},
		{
			name:   "V2 offset",
			offset: 2,
			want:   []uint16{1995, 0, 705, 1275},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			report := make([]byte, lianLiReportLength)
			report[0] = lianLiReportID
			for i, speed := range tt.want {
				start := tt.offset + i*2
				report[start] = byte(speed >> 8)
				report[start+1] = byte(speed)
			}

			got, err := decodeLianLiUniFanSpeeds(report, tt.offset)
			if err != nil {
				t.Fatalf("decodeLianLiUniFanSpeeds() error = %v", err)
			}
			assertUint16SliceEqual(t, got, tt.want)
		})
	}
}

func TestDecodeLianLiUniFanSpeedsShortReport(t *testing.T) {
	_, err := decodeLianLiUniFanSpeeds([]byte{lianLiReportID, 0x01}, 2)
	if err == nil {
		t.Fatal("decodeLianLiUniFanSpeeds() error = nil, want error")
	}
}

func TestFindLianLiUniDevices(t *testing.T) {
	sysPath := t.TempDir()
	writeHIDUEvent(t, sysPath, "hidraw8", "0003:00000CF2:0000A104", "usb-0000:0b:00.3-4/input0", "")
	writeHIDUEvent(t, sysPath, "hidraw9", "0003:00001B1C:00001C0B", "usb-ignored", "")
	writeHIDUEvent(t, sysPath, "hidraw10", "0003:00000CF2:0000FFFF", "usb-unsupported", "")

	devices := findLianLiUniDevices(sysPath)
	if len(devices) != 1 {
		t.Fatalf("len(devices) = %d, want 1", len(devices))
	}

	device := devices[0]
	if device.DevicePath != "/dev/hidraw8" {
		t.Fatalf("DevicePath = %q, want %q", device.DevicePath, "/dev/hidraw8")
	}
	if device.Info.ProductID != 0xa104 {
		t.Fatalf("ProductID = %#x, want %#x", device.Info.ProductID, 0xa104)
	}
	if device.Info.Description != "Lian Li Uni AL V2" {
		t.Fatalf("Description = %q, want %q", device.Info.Description, "Lian Li Uni AL V2")
	}
	if device.Info.ReportOffset != 2 {
		t.Fatalf("ReportOffset = %d, want 2", device.Info.ReportOffset)
	}
	if device.InstanceID != shortHash("usb-0000:0b:00.3-4/input0") {
		t.Fatalf("InstanceID = %q, want hash of HID_PHYS", device.InstanceID)
	}
}

func TestLianLiFanKey(t *testing.T) {
	device := lianLiUniDevice{
		Info:       lianLiUniDevices[0xa104],
		InstanceID: "12345678",
	}

	got := lianLiFanKey(device, 1)
	want := "lian_li_uni_al_v2_12345678_fan1"
	if got != want {
		t.Fatalf("lianLiFanKey() = %q, want %q", got, want)
	}
}

func writeHIDUEvent(t *testing.T, sysPath, hidrawName, hidID, hidPhys, hidUniq string) {
	t.Helper()

	devicePath := filepath.Join(sysPath, hidrawName, "device")
	if err := os.MkdirAll(devicePath, 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}

	data := "HID_ID=" + hidID + "\n" +
		"HID_NAME=ENE Technology, Inc. LianLi-UNI FAN-AL V2-v0.4\n" +
		"HID_PHYS=" + hidPhys + "\n"
	if hidUniq != "" {
		data += "HID_UNIQ=" + hidUniq + "\n"
	}

	if err := os.WriteFile(filepath.Join(devicePath, "uevent"), []byte(data), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
}

func assertUint16SliceEqual(t *testing.T, got, want []uint16) {
	t.Helper()

	if len(got) != len(want) {
		t.Fatalf("len(got) = %d, want %d", len(got), len(want))
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("got[%d] = %d, want %d", i, got[i], want[i])
		}
	}
}
