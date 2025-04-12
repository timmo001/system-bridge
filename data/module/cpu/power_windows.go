//go:build windows
// +build windows

package cpu

import (
	"fmt"

	"github.com/yusufpapurcu/wmi"
)

type win32ProcessorPower struct {
	Name                 string
	PercentProcessorTime uint64
	ProcessorFrequency   uint64
	PercentIdleTime      uint64
	PowerConsumption     uint32  // Power consumption in milliwatts
}

func getCPUPower() (float64, error) {
	var dst []win32ProcessorPower
	q := wmi.CreateQuery(&dst, "SELECT * FROM Win32_PerfFormattedData_Counters_ProcessorInformation WHERE Name='_Total'")

	if err := wmi.Query(q, &dst); err != nil {
		return 0, fmt.Errorf("failed to query CPU power: %v", err)
	}

	if len(dst) == 0 {
		return 0, fmt.Errorf("no CPU power data available")
	}

	// Convert milliwatts to watts
	powerWatts := float64(dst[0].PowerConsumption) / 1000.0
	return powerWatts, nil
}

func getCPUPowerPerCPU(id int) (float64, error) {
	var dst []win32ProcessorPower
	q := wmi.CreateQuery(&dst, "SELECT * FROM Win32_PerfFormattedData_Counters_ProcessorInformation WHERE Name='" + fmt.Sprint(id) + "'")

	if err := wmi.Query(q, &dst); err != nil {
		return 0, fmt.Errorf("failed to query CPU %d power: %v", id, err)
	}

	if len(dst) == 0 {
		return 0, fmt.Errorf("no CPU power data available for CPU %d", id)
	}

	// Convert milliwatts to watts
	powerWatts := float64(dst[0].PowerConsumption) / 1000.0
	return powerWatts, nil
}
