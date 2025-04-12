//go:build windows
// +build windows

package cpu

import (
	"fmt"

	"github.com/yusufpapurcu/wmi"
)

type win32ProcessorVoltage struct {
	Name             string
	CurrentVoltage   uint32
	VoltageCaps      uint32
}

// GetCPUVoltage returns the CPU voltage in volts
func GetCPUVoltage() (float64, error) {
	var dst []win32ProcessorVoltage
	q := wmi.CreateQuery(&dst, "SELECT * FROM Win32_Processor WHERE DeviceID='CPU0'")

	if err := wmi.Query(q, &dst); err != nil {
		return 0, fmt.Errorf("failed to query CPU voltage: %v", err)
	}

	if len(dst) == 0 {
		return 0, fmt.Errorf("no CPU voltage data available")
	}

	// Convert voltage from WMI format to actual voltage
	// WMI returns voltage in tenths of volts
	voltage := float64(dst[0].CurrentVoltage) / 10.0
	return voltage, nil
}

// GetCPUVoltagePerCPU returns the voltage for a specific CPU core in volts
func GetCPUVoltagePerCPU(id int) (float64, error) {
	var dst []win32ProcessorVoltage
	q := wmi.CreateQuery(&dst, fmt.Sprintf("SELECT * FROM Win32_Processor WHERE DeviceID='CPU%d'", id))

	if err := wmi.Query(q, &dst); err != nil {
		return 0, fmt.Errorf("failed to query CPU %d voltage: %v", id, err)
	}

	if len(dst) == 0 {
		return 0, fmt.Errorf("no voltage data available for CPU %d", id)
	}

	// Convert voltage from WMI format to actual voltage
	// WMI returns voltage in tenths of volts
	voltage := float64(dst[0].CurrentVoltage) / 10.0
	return voltage, nil
}
