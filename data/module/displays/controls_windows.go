//go:build windows

package displays

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"os/exec"
	"syscall"
	"unsafe"

	"github.com/timmo001/system-bridge/types"
	"github.com/yusufpapurcu/wmi"
)

var (
	dxva2                                   = syscall.NewLazyDLL("dxva2.dll")
	getNumberOfPhysicalMonitorsFromHMONITOR = dxva2.NewProc("GetNumberOfPhysicalMonitorsFromHMONITOR")
	getPhysicalMonitorsFromHMONITOR         = dxva2.NewProc("GetPhysicalMonitorsFromHMONITOR")
	destroyPhysicalMonitors                 = dxva2.NewProc("DestroyPhysicalMonitors")
	getMonitorBrightness                    = dxva2.NewProc("GetMonitorBrightness")
	setMonitorBrightness                    = dxva2.NewProc("SetMonitorBrightness")
	getVCPFeatureAndVCPFeatureReply         = dxva2.NewProc("GetVCPFeatureAndVCPFeatureReply")
	setVCPFeature                           = dxva2.NewProc("SetVCPFeature")
)

const vcpPowerMode = 0xD6

// physicalMonitor is PHYSICAL_MONITOR
type physicalMonitor struct {
	Handle      syscall.Handle
	Description [128]uint16
}

// withPhysicalMonitors runs fn for each DDC/CI monitor behind an HMONITOR. A
// cloned display can have more than one.
func withPhysicalMonitors(handle syscall.Handle, fn func(syscall.Handle) error) error {
	var count uint32
	ret, _, err := getNumberOfPhysicalMonitorsFromHMONITOR.Call(uintptr(handle), uintptr(unsafe.Pointer(&count)))
	if ret == 0 || count == 0 {
		return fmt.Errorf("%w: no physical monitors: %v", ErrUnsupported, err)
	}

	physical := make([]physicalMonitor, count)
	ret, _, err = getPhysicalMonitorsFromHMONITOR.Call(uintptr(handle), uintptr(count), uintptr(unsafe.Pointer(&physical[0])))
	if ret == 0 {
		return fmt.Errorf("%w: failed to get physical monitors: %v", ErrUnsupported, err)
	}
	defer func() {
		_, _, _ = destroyPhysicalMonitors.Call(uintptr(count), uintptr(unsafe.Pointer(&physical[0])))
	}()

	var first error
	for _, monitor := range physical {
		if err := fn(monitor.Handle); err != nil && first == nil {
			first = err
		}
	}
	return first
}

// readControls reads a monitor's brightness and power mode over DDC/CI
func readControls(handle syscall.Handle) (*float64, *types.DisplayPowerState) {
	var brightness *float64
	var state *types.DisplayPowerState
	err := withPhysicalMonitors(handle, func(monitor syscall.Handle) error {
		if brightness == nil {
			var minimum, current, maximum uint32
			ret, _, _ := getMonitorBrightness.Call(uintptr(monitor),
				uintptr(unsafe.Pointer(&minimum)), uintptr(unsafe.Pointer(&current)), uintptr(unsafe.Pointer(&maximum)))
			if ret != 0 && maximum > minimum {
				percent := math.Round(float64(current-minimum) / float64(maximum-minimum) * 100)
				brightness = &percent
			}
		}
		if state == nil {
			var current, maximum uint32
			ret, _, _ := getVCPFeatureAndVCPFeatureReply.Call(uintptr(monitor), vcpPowerMode, 0,
				uintptr(unsafe.Pointer(&current)), uintptr(unsafe.Pointer(&maximum)))
			if ret != 0 {
				state = powerState(int(current))
			}
		}
		return nil
	})
	if err != nil {
		slog.Debug("DDC/CI unavailable", "error", err)
	}
	return brightness, state
}

type wmiMonitorBrightness struct {
	Active            bool
	CurrentBrightness uint8
}

// addPanelBrightness gives a laptop's built-in panel its brightness from WMI.
// WMI doesn't say which display that is, so it's only used when exactly one
// display has no DDC/CI brightness, which a built-in panel never has.
func addPanelBrightness(displays []types.Display) {
	panel := -1
	for i, display := range displays {
		if display.Brightness == nil {
			if panel != -1 {
				return
			}
			panel = i
		}
	}
	if panel == -1 {
		return
	}

	var panels []wmiMonitorBrightness
	if err := wmi.QueryNamespace("SELECT Active, CurrentBrightness FROM WmiMonitorBrightness", &panels, `root\wmi`); err != nil {
		slog.Debug("WMI brightness unavailable", "error", err)
		return
	}
	var active []wmiMonitorBrightness
	for _, p := range panels {
		if p.Active {
			active = append(active, p)
		}
	}
	if len(active) != 1 {
		return
	}
	brightness := float64(active[0].CurrentBrightness)
	displays[panel].Brightness = &brightness
}

func findMonitor(id string) (syscall.Handle, error) {
	found, err := monitors()
	if err != nil {
		return 0, err
	}
	for _, m := range found {
		if m.display.ID == id {
			return m.handle, nil
		}
	}
	return 0, fmt.Errorf("display %s not found", id)
}

// SetBrightness sets a display's brightness, in percent, over DDC/CI, or
// through WMI for a built-in panel
func SetBrightness(ctx context.Context, id string, brightness float64) error {
	handle, err := findMonitor(id)
	if err != nil {
		return err
	}

	err = withPhysicalMonitors(handle, func(monitor syscall.Handle) error {
		var minimum, current, maximum uint32
		ret, _, err := getMonitorBrightness.Call(uintptr(monitor),
			uintptr(unsafe.Pointer(&minimum)), uintptr(unsafe.Pointer(&current)), uintptr(unsafe.Pointer(&maximum)))
		if ret == 0 || maximum <= minimum {
			return fmt.Errorf("%w: failed to read the brightness range: %v", ErrUnsupported, err)
		}
		value := minimum + uint32(math.Round(brightness/100*float64(maximum-minimum)))
		if ret, _, err := setMonitorBrightness.Call(uintptr(monitor), uintptr(value)); ret == 0 {
			return fmt.Errorf("failed to set the brightness: %v", err)
		}
		return nil
	})
	if err == nil {
		return nil
	}

	// A built-in panel has no DDC/CI. Only use WMI when it reported the
	// panel's brightness for this display.
	displays, listErr := GetDisplays(ctx)
	if listErr != nil {
		return err
	}
	for _, display := range displays {
		if display.ID != id || display.Brightness == nil {
			continue
		}
		script := fmt.Sprintf("(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods | Where-Object Active) | Invoke-CimMethod -MethodName WmiSetBrightness -Arguments @{Timeout=1; Brightness=%d}", int(math.Round(brightness)))
		if out, psErr := exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command", script).CombinedOutput(); psErr != nil {
			return fmt.Errorf("failed to set the panel brightness: %v: %s", psErr, out)
		}
		return nil
	}
	return err
}

// SetPowerState sets a monitor's power mode over DDC/CI
func SetPowerState(_ context.Context, id string, state types.DisplayPowerState) error {
	value, ok := powerStateValues[state]
	if !ok {
		return fmt.Errorf("unknown power state %q", state)
	}
	handle, err := findMonitor(id)
	if err != nil {
		return err
	}
	return withPhysicalMonitors(handle, func(monitor syscall.Handle) error {
		if ret, _, err := setVCPFeature.Call(uintptr(monitor), vcpPowerMode, uintptr(value)); ret == 0 {
			return fmt.Errorf("failed to set the power state: %v", err)
		}
		return nil
	})
}
