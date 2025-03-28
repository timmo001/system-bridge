package data_module

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
)

// CPUFrequency represents CPU frequency information
type CPUFrequency struct {
	Current *float64 `json:"current,omitempty"`
	Min     *float64 `json:"min,omitempty"`
	Max     *float64 `json:"max,omitempty"`
}

// CPUStats represents CPU statistics
type CPUStats struct {
	CtxSwitches    *int64 `json:"ctx_switches,omitempty"`
	Interrupts     *int64 `json:"interrupts,omitempty"`
	SoftInterrupts *int64 `json:"soft_interrupts,omitempty"`
	Syscalls       *int64 `json:"syscalls,omitempty"`
}

// CPUTimes represents CPU timing information
type CPUTimes struct {
	User      *float64 `json:"user,omitempty"`
	System    *float64 `json:"system,omitempty"`
	Idle      *float64 `json:"idle,omitempty"`
	Interrupt *float64 `json:"interrupt,omitempty"`
	DPC       *float64 `json:"dpc,omitempty"`
}

// PerCPU represents per-CPU information
type PerCPU struct {
	ID           int           `json:"id"`
	Frequency    *CPUFrequency `json:"frequency,omitempty"`
	Power        *float64      `json:"power,omitempty"`
	Times        *CPUTimes     `json:"times,omitempty"`
	TimesPercent *CPUTimes     `json:"times_percent,omitempty"`
	Usage        *float64      `json:"usage,omitempty"`
	Voltage      *float64      `json:"voltage,omitempty"`
}

// CPUData represents overall CPU information
type CPUData struct {
	Count        *int          `json:"count,omitempty"`
	Frequency    *CPUFrequency `json:"frequency,omitempty"`
	LoadAverage  *float64      `json:"load_average,omitempty"`
	PerCPU       []PerCPU      `json:"per_cpu,omitempty"`
	Power        *float64      `json:"power,omitempty"`
	Stats        *CPUStats     `json:"stats,omitempty"`
	Temperature  *float64      `json:"temperature,omitempty"`
	Times        *CPUTimes     `json:"times,omitempty"`
	TimesPercent *CPUTimes     `json:"times_percent,omitempty"`
	Usage        *float64      `json:"usage,omitempty"`
	Voltage      *float64      `json:"voltage,omitempty"`
}

func (t *Module) UpdateCPUModule() (CPUData, error) {
	log.Info("Getting CPU data")

	var cpuData CPUData

	// Get CPU count
	count, err := cpu.Counts(true)
	if err != nil {
		return cpuData, fmt.Errorf("error getting CPU count: %v", err)
	}
	cpuData.Count = &count

	// Get CPU frequency
	frequencies, err := cpu.Info()
	if err == nil && len(frequencies) > 0 {
		freq := CPUFrequency{
			Current: &frequencies[0].Mhz,
		}
		cpuData.Frequency = &freq
	}

	// Get per CPU info
	perCPU := make([]PerCPU, 0)
	for i, cpuInfo := range frequencies {
		perCpuData := PerCPU{
			ID: i,
			Frequency: &CPUFrequency{
				Current: &cpuInfo.Mhz,
			},
		}

		// Get per CPU times
		if times, err := cpu.Times(true); err == nil && i < len(times) {
			perCpuData.Times = &CPUTimes{
				User:      &times[i].User,
				System:    &times[i].System,
				Idle:      &times[i].Idle,
				Interrupt: &times[i].Irq,
			}
		}

		// Get per CPU usage percentage
		if percents, err := cpu.Percent(4, true); err == nil && i < len(percents) {
			usage := percents[i]
			perCpuData.Usage = &usage
		}

		perCPU = append(perCPU, perCpuData)
	}
	cpuData.PerCPU = perCPU

	// Get overall CPU times
	if times, err := cpu.Times(false); err == nil && len(times) > 0 {
		cpuData.Times = &CPUTimes{
			User:      &times[0].User,
			System:    &times[0].System,
			Idle:      &times[0].Idle,
			Interrupt: &times[0].Irq,
		}
	}

	// Get overall CPU usage percentage
	if percents, err := cpu.Percent(4, false); err == nil && len(percents) > 0 {
		usage := percents[0]
		cpuData.Usage = &usage
	}

	// Get load average where supported (Unix systems)
	if load, err := load.Avg(); err == nil {
		loadAvg := load.Load1
		cpuData.LoadAverage = &loadAvg
	}

	// Get CPU temperature where available
	if temps, err := host.SensorsTemperatures(); err == nil {
		for _, temp := range temps {
			if strings.Contains(strings.ToLower(temp.SensorKey), "cpu") {
				temperature := temp.Temperature
				cpuData.Temperature = &temperature
				break
			}
		}
	}

	return cpuData, nil
}
