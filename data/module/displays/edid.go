//go:build linux

package displays

import (
	"bytes"
	"strings"
)

var edidHeader = []byte{0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00}

// edidInfo is what the base EDID block says about a monitor
type edidInfo struct {
	Manufacturer string
	Model        string
	// Physical size, in millimetres
	Width  int
	Height int
	// The preferred mode's resolution, which is usually the panel's native one
	ResolutionHorizontal int
	ResolutionVertical   int
}

// parseEDID reads the base block of an EDID. It reports false when the data
// isn't one.
func parseEDID(data []byte) (edidInfo, bool) {
	var info edidInfo
	if len(data) < 128 || !bytes.Equal(data[:8], edidHeader) {
		return info, false
	}

	// Three letters, five bits each, with 1 for A
	id := uint16(data[8])<<8 | uint16(data[9])
	letters := []byte{
		byte(id>>10&0x1f) + 'A' - 1,
		byte(id>>5&0x1f) + 'A' - 1,
		byte(id&0x1f) + 'A' - 1,
	}
	if bytes.IndexFunc(letters, func(r rune) bool { return r < 'A' || r > 'Z' }) == -1 {
		info.Manufacturer = string(letters)
	}

	// Centimetres, or zero for a projector or an unknown size
	info.Width = int(data[21]) * 10
	info.Height = int(data[22]) * 10

	for offset := 54; offset <= 108; offset += 18 {
		descriptor := data[offset : offset+18]
		if descriptor[0] != 0 || descriptor[1] != 0 {
			// A detailed timing. The first one is the preferred mode.
			if info.ResolutionHorizontal == 0 {
				info.ResolutionHorizontal = int(descriptor[2]) | int(descriptor[4]&0xf0)<<4
				info.ResolutionVertical = int(descriptor[5]) | int(descriptor[7]&0xf0)<<4
			}
			continue
		}
		// The display product name
		if descriptor[3] == 0xfc {
			name, _, _ := bytes.Cut(descriptor[5:], []byte{0x0a})
			info.Model = strings.TrimSpace(string(name))
		}
	}

	return info, true
}
