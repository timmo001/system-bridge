//go:build windows
// +build windows

package cpu

import (
	"fmt"

	"github.com/yusufpapurcu/wmi"
)

type win32ProcessorFrequency struct {
	Name                 string
	MaxClockSpeed       uint32
	CurrentClockSpeed   uint32
}

// getCPUFrequencies returns the min, max, and current frequencies for a specific CPU
func getCPUFrequencies(cpuID int) (min, max, current float64, err error) {
	var dst []win32ProcessorFrequency
	q := wmi.CreateQuery(&dst, fmt.Sprintf("SELECT * FROM Win32_Processor WHERE DeviceID='CPU%d'", cpuID))

	if err := wmi.Query(q, &dst); err != nil {
		return 0, 0, 0, fmt.Errorf("failed to query CPU frequencies: %v", err)
	}

	if len(dst) == 0 {
		return 0, 0, 0, fmt.Errorf("no CPU frequency data available")
	}

	// Windows doesn't provide min frequency directly, estimate as 1/4 of max
	max = float64(dst[0].MaxClockSpeed)
	min = max / 4.0
	current = float64(dst[0].CurrentClockSpeed)

	return min, max, current, nil
}

// GetCPUFrequency returns the min, max, and current frequencies for CPU 0
func GetCPUFrequency() (min, max, current float64, err error) {
	return getCPUFrequencies(0)
}

// GetCPUFrequencyPerCPU returns the min, max, and current frequencies for a specific CPU
func GetCPUFrequencyPerCPU(id int) (min, max, current float64, err error) {
	return getCPUFrequencies(id)
}
