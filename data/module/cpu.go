package data_module

import (
	"context"
	"fmt"
	"strings"
	"time"

	"log/slog"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/sensors"
	cm "github.com/timmo001/system-bridge/data/module/cpu"
	"github.com/timmo001/system-bridge/types"
)

type CPUModule struct{}

func (cpuModule CPUModule) Name() types.ModuleName { return types.ModuleCPU }
func (cpuModule CPUModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting CPU data")

	// Use a zero interval to avoid blocking; returns instantaneous usage based on
	// the most recent CPU times snapshot instead of sleeping to calculate deltas.
	percentageInterval := 0 * time.Second

	var cpuData types.CPUData
	// Initialize arrays
	cpuData.PerCPU = make([]types.PerCPU, 0)

	// Get CPU count
	count, err := cpu.CountsWithContext(ctx, true)
	if err != nil {
		return cpuData, fmt.Errorf("error getting CPU count: %v", err)
	}
	cpuData.Count = &count

	// Get CPU frequency
	frequencies, err := cpu.InfoWithContext(ctx)
	if err == nil && len(frequencies) > 0 {
		freq := types.CPUFrequency{
			Current: &frequencies[0].Mhz,
		}
		// Attempt to populate min/max frequency (best-effort, Linux via sysfs)
		// We determine overall min as the minimum of per-CPU mins and overall max
		// as the maximum of per-CPU maxes.
		var overallMinMHz *float64
		var overallMaxMHz *float64
		for i := range frequencies {
			minMHz, maxMHz := cm.GetPerCPUFreqBounds(i)
			if minMHz != nil {
				if overallMinMHz == nil || *minMHz < *overallMinMHz {
					overallMinMHz = minMHz
				}
			}
			if maxMHz != nil {
				if overallMaxMHz == nil || *maxMHz > *overallMaxMHz {
					overallMaxMHz = maxMHz
				}
			}
		}
		freq.Min = overallMinMHz
		freq.Max = overallMaxMHz
		cpuData.Frequency = &freq
	}

	// OS-specific best-effort overall CPU power sampling (compute early to optionally distribute per-core)
	var overallPower *float64
	if p := cm.ComputeCPUPower(200 * time.Millisecond); p != nil {
		overallPower = p
	}

	// Pre-fetch per-CPU times and usage slices once to avoid repeated expensive calls
	timesPerCPU, _ := cpu.TimesWithContext(ctx, true)
	percentsPerCPU, _ := cpu.PercentWithContext(ctx, percentageInterval, true)
	// Compute per-CPU times percent once (short sampling interval)
	perPct := computeTimesPercent(true)
	// Windows-only: absolute DPC time over short sampling interval
	dpcTimePer := cm.GetDPCTimeSeconds(true, 200*time.Millisecond)
	// Read overall CPU Vcore voltage once (best-effort, OS-specific)
	vcore := cm.ReadCPUVcoreVoltage()

	// Get per CPU info
	perCPU := make([]types.PerCPU, 0, len(frequencies))
	// Precompute weighted per-core power if overall power available
	var perCorePowers []float64
	if overallPower != nil && len(percentsPerCPU) > 0 {
		var sum float64
		perCorePowers = make([]float64, len(percentsPerCPU))
		for i := range percentsPerCPU {
			u := percentsPerCPU[i]
			if u < 0 {
				u = 0
			}
			perCorePowers[i] = u
			sum += u
		}
		if sum > 0 {
			for i := range perCorePowers {
				perCorePowers[i] = (*overallPower) * (perCorePowers[i] / sum)
			}
		} else if cpuData.Count != nil && *cpuData.Count > 0 {
			// Fallback to equal distribution
			for i := range perCorePowers {
				perCorePowers[i] = (*overallPower) / float64(*cpuData.Count)
			}
		}
	}
	// Get per CPU info - loop based on actual CPU count, not frequencies array length
	if cpuData.Count != nil && *cpuData.Count > 0 {
		for i := 0; i < *cpuData.Count; i++ {
			perCpuData := types.PerCPU{
				ID:  i,
			}

			// Get frequency for this CPU
			// On Windows, cpu.Info() may return only 1 entry for all CPUs
			if len(frequencies) > 0 {
				cpuInfo := frequencies[0] // Use first entry as default
				if i < len(frequencies) {
					cpuInfo = frequencies[i] // Use specific entry if available
				}
				perCpuData.Frequency = &types.CPUFrequency{
					Current: &cpuInfo.Mhz,
				}

				// Best-effort:  populate per-CPU min/max frequency via OS-specific implementation
				minMHz, maxMHz := cm.GetPerCPUFreqBounds(i)
				if perCpuData.Frequency != nil {
					perCpuData.Frequency.Min = minMHz
					perCpuData.Frequency.Max = maxMHz
				}
			}

			// Get per CPU times
			if i < len(timesPerCPU) {
				perCpuData.Times = &types.CPUTimes{
					User:      &timesPerCPU[i].User,
					System:    &timesPerCPU[i].System,
					Idle:      &timesPerCPU[i].Idle,
					Interrupt: &timesPerCPU[i].Irq,
				}

				// Windows-only: set absolute DPC time seconds when available
				if i < len(dpcTimePer) && dpcTimePer != nil {
					val := dpcTimePer[i]
					perCpuData.Times.DPC = &val
				}

				// Per-CPU times percent from sampled delta
				if perPct != nil && i < len(perPct) && perPct[i] != nil {
					perCpuData.TimesPercent = &types.CPUTimes{
						User:      perPct[i].User,
						System:    perPct[i].System,
						Idle:      perPct[i].Idle,
						Interrupt:  perPct[i].Interrupt,
					}
				}

				// Windows-only: best-effort DPC percentage per-CPU
				if dpcs := cm.GetDPCPercentages(true); i < len(dpcs) {
					if perCpuData.TimesPercent == nil {
						perCpuData.TimesPercent = &types.CPUTimes{}
					}
					d := dpcs[i]
					perCpuData.TimesPercent.DPC = &d
				}
			}

			// Get per CPU usage percentage
			if i < len(percentsPerCPU) {
				usage := percentsPerCPU[i]
				perCpuData.Usage = &usage
			}

			// Best-effort: distribute overall package power across cores weighted by usage
			if i < len(perCorePowers) && overallPower != nil {
				val := perCorePowers[i]
				perCpuData.Power = &val
			}

			perCPU = append(perCPU, perCpuData)
		}
	}
	cpuData.PerCPU = perCPU

	// Get overall CPU times
	if times, err := cpu.Times(false); err == nil && len(times) > 0 {
		cpuData.Times = &types.CPUTimes{
			User:      &times[0].User,
			System:    &times[0].System,
			Idle:      &times[0].Idle,
			Interrupt: &times[0].Irq,
		}

		// Windows-only: absolute DPC time seconds overall
		if dpcs := cm.GetDPCTimeSeconds(false, 200*time.Millisecond); len(dpcs) > 0 {
			val := dpcs[0]
			cpuData.Times.DPC = &val
		}

		// Overall times percent from sampled delta
		if overallPct := computeTimesPercent(false); len(overallPct) > 0 && overallPct[0] != nil {
			tp := types.CPUTimes{
				User:      overallPct[0].User,
				System:    overallPct[0].System,
				Idle:      overallPct[0].Idle,
				Interrupt: overallPct[0].Interrupt,
			}
			cpuData.TimesPercent = &tp
		}

		// Windows-only: best-effort overall DPC percentage
		if dpcs := cm.GetDPCPercentages(false); len(dpcs) > 0 {
			if cpuData.TimesPercent == nil {
				cpuData.TimesPercent = &types.CPUTimes{}
			}
			d := dpcs[0]
			cpuData.TimesPercent.DPC = &d
		}
	}

	// Get overall CPU usage percentage (non-blocking)
	if percents, err := cpu.PercentWithContext(ctx, percentageInterval, false); err == nil && len(percents) > 0 {
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
				t := temp.Temperature
				cpuData.Temperature = &t
				break
			}
		}
	}
	// OS-specific fallbacks for temperature
	if cpuData.Temperature == nil {
		if t := cm.ReadCPUTemperature(); t != nil {
			cpuData.Temperature = t
		}
	}

	// Overall CPU power
	if overallPower != nil {
		cpuData.Power = overallPower
	}

	// CPU statistics (OS-specific best-effort)
	if stats := cm.ReadCPUStats(); stats != nil {
		cpuData.Stats = stats
	}

	// Overall CPU voltage (best-effort OS-specific)
	if vcore != nil {
		cpuData.Voltage = vcore
	}

	return cpuData, nil
}

// computeTimesPercent calculates per-state CPU time percentages over a short
// sampling interval. Returns a slice of CPUTimes pointers when percpu is true,
// otherwise a single-element slice for overall.
func computeTimesPercent(percpu bool) []*types.CPUTimes {
	// Short interval to minimize blocking but still obtain a delta
	const sample = 200 * time.Millisecond
	t1, err := cpu.Times(percpu)
	if err != nil || len(t1) == 0 {
		return nil
	}
	time.Sleep(sample)
	t2, err := cpu.Times(percpu)
	if err != nil || len(t2) == 0 || len(t2) != len(t1) {
		return nil
	}

	out := make([]*types.CPUTimes, 0, len(t2))
	for i := range t2 {
		dUser := t2[i].User - t1[i].User
		dSystem := t2[i].System - t1[i].System
		dIdle := t2[i].Idle - t1[i].Idle
		dIrq := t2[i].Irq - t1[i].Irq
		// Total delta across all accounted fields (align with gopsutil Total)
		tot1 := t1[i].User + t1[i].System + t1[i].Idle + t1[i].Nice + t1[i].Iowait + t1[i].Irq + t1[i].Softirq + t1[i].Steal + t1[i].Guest + t1[i].GuestNice
		tot2 := t2[i].User + t2[i].System + t2[i].Idle + t2[i].Nice + t2[i].Iowait + t2[i].Irq + t2[i].Softirq + t2[i].Steal + t2[i].Guest + t2[i].GuestNice
		dTot := tot2 - tot1
		if dTot <= 0 {
			out = append(out, &types.CPUTimes{})
			continue
		}
		u := (dUser / dTot) * 100
		s := (dSystem / dTot) * 100
		id := (dIdle / dTot) * 100
		irq := (dIrq / dTot) * 100
		out = append(out, &types.CPUTimes{User: &u, System: &s, Idle: &id, Interrupt: &irq})
	}
	return out
}
