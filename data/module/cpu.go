package data_module

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"log/slog"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/sensors"
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
			minMHz, maxMHz := readLinuxSysfsCPUFreq(i)
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

	// Pre-fetch per-CPU times and usage slices once to avoid repeated expensive calls
	timesPerCPU, _ := cpu.TimesWithContext(ctx, true)
	percentsPerCPU, _ := cpu.PercentWithContext(ctx, percentageInterval, true)

	// Get per CPU info
	perCPU := make([]types.PerCPU, 0, len(frequencies))
	for i, cpuInfo := range frequencies {
		perCpuData := types.PerCPU{
			ID: i,
			Frequency: &types.CPUFrequency{
				Current: &cpuInfo.Mhz,
			},
		}

		// Best-effort: populate per-CPU min/max frequency on Linux via sysfs
		minMHz, maxMHz := readLinuxSysfsCPUFreq(i)
		if perCpuData.Frequency != nil {
			perCpuData.Frequency.Min = minMHz
			perCpuData.Frequency.Max = maxMHz
		}

		// Get per CPU times
		if i < len(timesPerCPU) {
			perCpuData.Times = &types.CPUTimes{
				User:      &timesPerCPU[i].User,
				System:    &timesPerCPU[i].System,
				Idle:      &timesPerCPU[i].Idle,
				Interrupt: &timesPerCPU[i].Irq,
				// TODO: Add implementation for DPC time
			}

			// TODO: Add implementation for TimesPercent
		}

		// Get per CPU usage percentage
		if i < len(percentsPerCPU) {
			usage := percentsPerCPU[i]
			perCpuData.Usage = &usage
		}

		// TODO: Add implementation for per-CPU power consumption
		// TODO: Add implementation for per-CPU voltage monitoring

		perCPU = append(perCPU, perCpuData)
	}
	cpuData.PerCPU = perCPU

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

// readLinuxSysfsCPUFreq attempts to read per-CPU min/max frequencies from Linux sysfs.
// Returns values in MHz if available; otherwise returns nils. This function is safe to
// call on non-Linux hosts and will simply return nils.
func readLinuxSysfsCPUFreq(cpuIndex int) (minMHz *float64, maxMHz *float64) {
	// Quick OS check by probing for the sysfs directory; avoids importing runtime.
	base := "/sys/devices/system/cpu"
	cpuDir := filepath.Join(base, fmt.Sprintf("cpu%d", cpuIndex), "cpufreq")
	if _, err := os.Stat(cpuDir); err != nil {
		return nil, nil
	}

	// Helper to read a single kHz value file and convert to MHz
	readMHz := func(path string) *float64 {
		b, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		s := strings.TrimSpace(string(b))
		if s == "" {
			return nil
		}
		// Values are typically integers in kHz
		// Some kernels may expose floating values; handle generically
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return nil
		}
		mhz := v / 1000.0
		return &mhz
	}

	minPath := filepath.Join(cpuDir, "cpuinfo_min_freq")
	maxPath := filepath.Join(cpuDir, "cpuinfo_max_freq")
	return readMHz(minPath), readMHz(maxPath)
}
