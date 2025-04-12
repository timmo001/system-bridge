package data_module

import (
	"fmt"

	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/load"
	localcpu "github.com/timmo001/system-bridge/data/module/cpu"
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
	min, max, current, err := localcpu.GetCPUFrequency()
	if err == nil {
		freq := types.CPUFrequency{
			Current: &current,
			Min:     &min,
			Max:     &max,
		}
		cpuData.Frequency = &freq
	} else {
		// Fallback to gopsutil if local implementation fails
		frequencies, err := cpu.Info()
		if err == nil && len(frequencies) > 0 {
			freq := types.CPUFrequency{
				Current: &frequencies[0].Mhz,
			}
			cpuData.Frequency = &freq
		}
	}

	// Get per CPU info
	frequencies, err := cpu.Info()
	if err == nil && len(frequencies) > 0 {
		perCPU := make([]types.PerCPU, 0, len(frequencies))
		for i, cpuInfo := range frequencies {
			perCpuData := types.PerCPU{
				ID: i,
			}

			// Get per-CPU frequencies
			min, max, current, err := localcpu.GetCPUFrequencyPerCPU(i)
			if err == nil {
				perCpuData.Frequency = &types.CPUFrequency{
					Current: &current,
					Min:     &min,
					Max:     &max,
				}
			} else {
				// Fallback to gopsutil if local implementation fails
				perCpuData.Frequency = &types.CPUFrequency{
					Current: &cpuInfo.Mhz,
				}
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

			// Get per-CPU power consumption
			if power, err := localcpu.GetCPUPowerPerCPU(i); err == nil {
				perCpuData.Power = &power
			}

			// Get per-CPU voltage
			if voltage, err := localcpu.GetCPUVoltagePerCPU(i); err == nil {
				perCpuData.Voltage = &voltage
			}

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
			// TODO: Add implementation for DPC time
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

	// Get CPU temperature
	if temp, err := localcpu.GetCPUTemperature(); err == nil {
		cpuData.Temperature = &temp
	}

	// Get overall CPU power consumption
	if power, err := localcpu.GetCPUPower(); err == nil {
		cpuData.Power = &power
	}

	// Get overall CPU voltage
	if voltage, err := localcpu.GetCPUVoltage(); err == nil {
		cpuData.Voltage = &voltage
	}

	// TODO: Add implementation for CPU statistics (CtxSwitches, Interrupts, SoftInterrupts, Syscalls)

	return cpuData, nil
}
