//go:build darwin
// +build darwin

package displays

/*
#cgo LDFLAGS: -framework CoreGraphics -framework CoreFoundation
#include <CoreGraphics/CoreGraphics.h>

CGDirectDisplayID getMainDisplayID() {
    return CGMainDisplayID();
}

int getActiveDisplays(CGDirectDisplayID *displays, int maxDisplays) {
    uint32_t count;
    CGGetActiveDisplayList(maxDisplays, displays, &count);
    return count;
}

int getDisplayWidth(CGDirectDisplayID display) {
    return (int)CGDisplayPixelsWide(display);
}

int getDisplayHeight(CGDirectDisplayID display) {
    return (int)CGDisplayPixelsHigh(display);
}

int getDisplayX(CGDirectDisplayID display) {
    CGRect bounds = CGDisplayBounds(display);
    return (int)bounds.origin.x;
}

int getDisplayY(CGDirectDisplayID display) {
    CGRect bounds = CGDisplayBounds(display);
    return (int)bounds.origin.y;
}

double getDisplayRefreshRate(CGDirectDisplayID display) {
    CGDisplayModeRef mode = CGDisplayCopyDisplayMode(display);
    double refreshRate = CGDisplayModeGetRefreshRate(mode);
    CGDisplayModeRelease(mode);
    return refreshRate;
}

int isDisplayBuiltin(CGDirectDisplayID display) {
    return CGDisplayIsBuiltin(display);
}
*/
import "C"
import (
	"fmt"
	"unsafe"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

func GetDisplays() ([]types.Display, error) {
	const maxDisplays = 16
	displays := make([]types.Display, 0)

	// Allocate array for display IDs
	cDisplays := make([]C.CGDirectDisplayID, maxDisplays)
	count := C.getActiveDisplays(&cDisplays[0], maxDisplays)
	if count < 1 {
		return nil, fmt.Errorf("no displays found")
	}

	mainDisplay := C.getMainDisplayID()

	// Convert C array to Go slice
	displayIDs := (*[maxDisplays]C.CGDirectDisplayID)(unsafe.Pointer(&cDisplays[0]))[:count:count]

	for _, displayID := range displayIDs {
		width := int(C.getDisplayWidth(displayID))
		height := int(C.getDisplayHeight(displayID))
		x := int(C.getDisplayX(displayID))
		y := int(C.getDisplayY(displayID))
		refreshRate := float64(C.getDisplayRefreshRate(displayID))
		isPrimary := displayID == mainDisplay

		display := types.Display{
			ID:                   fmt.Sprintf("%d", displayID),
			Name:                 fmt.Sprintf("Display %d", displayID),
			ResolutionHorizontal: width,
			ResolutionVertical:   height,
			X:                    x,
			Y:                    y,
			RefreshRate:          &refreshRate,
			IsPrimary:            &isPrimary,
		}

		if displayID == mainDisplay {
			displays = append([]types.Display{display}, displays...)
		} else {
			displays = append(displays, display)
		}
	}

	if len(displays) == 0 {
		log.Warn("No displays found")
		return displays, nil
	}

	return displays, nil
}
