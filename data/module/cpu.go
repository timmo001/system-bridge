package data_module

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/sensors"
	"github.com/timmo001/system-bridge/types"
)

// CPUFrequency represents CPU frequency information
type CPUFrequency struct {
	Current *float64 `json:"current"`
	Min     *float64 `json:"min"` // TODO: Implement minimum frequency detection
	Max     *float64 `json:"max"` // TODO: Implement maximum frequency detection
}

// CPUStats represents CPU statistics
type CPUStats struct {
	// TODO: Implement CPU statistics collection
	CtxSwitches    *int64 `json:"ctx_switches"`    // Context switches count
	Interrupts     *int64 `json:"interrupts"`      // Hardware interrupts count
	SoftInterrupts *int64 `json:"soft_interrupts"` // Software interrupts count
	Syscalls       *int64 `json:"syscalls"`        // System calls count
}

// CPUTimes represents CPU timing information
type CPUTimes struct {
	User      *float64 `json:"user"`
	System    *float64 `json:"system"`
	Idle      *float64 `json:"idle"`
	Interrupt *float64 `json:"interrupt"`
	DPC       *float64 `json:"dpc"` // TODO: Implement Deferred Procedure Call time tracking
}

// PerCPU represents per-CPU information
type PerCPU struct {
	ID           int           `json:"id"`
	Frequency    *CPUFrequency `json:"frequency"`
	Power        *float64      `json:"power"` // TODO: Implement per-CPU power consumption monitoring
	Times        *CPUTimes     `json:"times"`
	TimesPercent *CPUTimes     `json:"times_percent"` // TODO: Implement per-CPU time percentage calculations
	Usage        *float64      `json:"usage"`
	Voltage      *float64      `json:"voltage"` // TODO: Implement per-CPU voltage monitoring
}

// CPUData represents overall CPU information
type CPUData struct {
	Count        *int          `json:"count"`
	Frequency    *CPUFrequency `json:"frequency"`
	LoadAverage  *float64      `json:"load_average"`
	PerCPU       []PerCPU      `json:"per_cpu"`
	Power        *float64      `json:"power"` // TODO: Implement overall CPU power consumption monitoring
	Stats        *CPUStats     `json:"stats"` // TODO: Implement overall CPU statistics collection
	Temperature  *float64      `json:"temperature"`
	Times        *CPUTimes     `json:"times"`
	TimesPercent *CPUTimes     `json:"times_percent"` // TODO: Implement overall CPU time percentage calculations
	Usage        *float64      `json:"usage"`
	Voltage      *float64      `json:"voltage"` // TODO: Implement overall CPU voltage monitoring
}

func (cpuData CPUData) Name() types.ModuleName { return types.ModuleCPU }
func (cpuData CPUData) Update(ctx context.Context) (any, error) {
	log.Info("Getting CPU data")

	// Initialize arrays
	cpuData.PerCPU = make([]PerCPU, 0)

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
			// TODO: Add implementation for Min frequency
			// TODO: Add implementation for Max frequency
		}
		cpuData.Frequency = &freq
	}

	// Get per CPU info
	if len(frequencies) > 0 {
		perCPU := make([]PerCPU, 0, len(frequencies))
		for i, cpuInfo := range frequencies {
			perCpuData := PerCPU{
				ID: i,
				Frequency: &CPUFrequency{
					Current: &cpuInfo.Mhz,
					// TODO: Add implementation for per-CPU Min frequency
					// TODO: Add implementation for per-CPU Max frequency
				},
			}

			// Get per CPU times
			if times, err := cpu.Times(true); err == nil && i < len(times) {
				perCpuData.Times = &CPUTimes{
					User:      &times[i].User,
					System:    &times[i].System,
					Idle:      &times[i].Idle,
					Interrupt: &times[i].Irq,
					// TODO: Add implementation for DPC time
				}

				// TODO: Add implementation for TimesPercent
			}

			// Get per CPU usage percentage
			if percents, err := cpu.Percent(4, true); err == nil && i < len(percents) {
				usage := percents[i]
				perCpuData.Usage = &usage
			}

			// TODO: Add implementation for per-CPU power consumption
			// TODO: Add implementation for per-CPU voltage monitoring

			perCPU = append(perCPU, perCpuData)
		}
		cpuData.PerCPU = perCPU
	}

	// Get overall CPU times
	if times, err := cpu.Times(false); err == nil && len(times) > 0 {
		cpuData.Times = &CPUTimes{
			User:      &times[0].User,
			System:    &times[0].System,
			Idle:      &times[0].Idle,
			Interrupt: &times[0].Irq,
			// TODO: Add implementation for overall DPC time
		}

		// TODO: Add implementation for overall TimesPercent
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
	if temps, err := sensors.SensorsTemperatures(); err == nil {
		for _, temp := range temps {
			if strings.Contains(strings.ToLower(temp.SensorKey), "cpu") {
				temperature := temp.Temperature
				cpuData.Temperature = &temperature
				break
			}
		}
	}

	// TODO: Add implementation for overall CPU power consumption
	// TODO: Add implementation for overall CPU voltage monitoring
	// TODO: Add implementation for CPU statistics (CtxSwitches, Interrupts, SoftInterrupts, Syscalls)

	return cpuData, nil
}
