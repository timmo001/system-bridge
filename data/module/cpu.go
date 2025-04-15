package data_module

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/sensors"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateCPUModule() (types.CPUData, error) {
	log.Info("Getting CPU data")

	var cpuData types.CPUData
	// Initialize arrays
	cpuData.PerCPU = make([]types.PerCPU, 0)

	// Get CPU count
	count, err := cpu.Counts(true)
	if err != nil {
		return cpuData, fmt.Errorf("error getting CPU count: %v", err)
	}
	cpuData.Count = &count

	// Get CPU frequency
	frequencies, err := cpu.Info()
	if err == nil && len(frequencies) > 0 {
		freq := types.CPUFrequency{
			Current: &frequencies[0].Mhz,
			// TODO: Add implementation for Min frequency
			// TODO: Add implementation for Max frequency
		}
		cpuData.Frequency = &freq
	}

	// Get per CPU info
	if len(frequencies) > 0 {
		perCPU := make([]types.PerCPU, 0, len(frequencies))
		for i, cpuInfo := range frequencies {
			perCpuData := types.PerCPU{
				ID: i,
				Frequency: &types.CPUFrequency{
					Current: &cpuInfo.Mhz,
					// TODO: Add implementation for per-CPU Min frequency
					// TODO: Add implementation for per-CPU Max frequency
				},
			}

			// Get per CPU times
			if times, err := cpu.Times(true); err == nil && i < len(times) {
				perCpuData.Times = &types.CPUTimes{
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
		cpuData.Times = &types.CPUTimes{
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
