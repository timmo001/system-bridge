package data_module

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"log/slog"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/sensors"
	cm "github.com/timmo001/system-bridge/data/module/cpu"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// cpuSampleWindow is the interval over which the times percent and package
// power deltas are sampled. They run at the same time, so an update blocks
// for one window rather than one per reading. Windows DPC time is read from
// a performance counter with its own window, reported in the sample.
const cpuSampleWindow = 200 * time.Millisecond

// cpuFreqBoundsTTL is how long per-CPU frequency limits are kept. They are
// hardware constants, or on Windows a power plan setting, and on Windows
// and macOS reading them means starting a process.
const cpuFreqBoundsTTL = 10 * time.Minute

var cpuFreqBoundsCache = utils.TTLValue[[]cm.FreqBounds]{TTL: cpuFreqBoundsTTL}

// getCPUFreqBounds returns the min/max frequency for each of count CPUs.
func getCPUFreqBounds(count int) []cm.FreqBounds {
	load := func() ([]cm.FreqBounds, bool) { return cm.FreqBoundsPerCPU(count), true }
	bounds, _ := cpuFreqBoundsCache.Get(load)
	if len(bounds) != count {
		// CPU count changed (hot-plug); refresh for the new layout.
		cpuFreqBoundsCache.Reset()
		bounds, _ = cpuFreqBoundsCache.Get(load)
	}
	return bounds
}

type CPUModule struct{}

func (cpuModule CPUModule) Name() types.ModuleName { return types.ModuleCPU }
func (cpuModule CPUModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting CPU data")

	var cpuData types.CPUData
	// Initialize arrays
	cpuData.PerCPU = make([]types.PerCPU, 0)

	// Get CPU count
	count, err := cpu.CountsWithContext(ctx, true)
	if err != nil {
		return cpuData, fmt.Errorf("error getting CPU count: %v", err)
	}
	cpuData.Count = &count

	// Start the readings that need a sampling window. They sleep for the
	// window concurrently while the instantaneous readings below are taken.
	var (
		sampleWG     sync.WaitGroup
		overallPower *float64
		perPct       []*types.CPUTimes
		overallPct   *types.CPUTimes
		dpc          cm.DPCSample
	)
	sampleWG.Add(3)
	go func() {
		defer sampleWG.Done()
		overallPower = cm.ComputeCPUPower(cpuSampleWindow)
	}()
	go func() {
		defer sampleWG.Done()
		perPct, overallPct = computeTimesPercent(cpuSampleWindow)
	}()
	go func() {
		defer sampleWG.Done()
		dpc = cm.SampleDPC()
	}()

	// Get CPU frequency and identity
	frequencies, err := cpu.InfoWithContext(ctx)
	freqBounds := getCPUFreqBounds(count)
	if err == nil && len(frequencies) > 0 {
		// Populate CPU identity from the first logical processor entry. Useful for
		// identifying newer silicon (e.g. Intel Core Ultra / Panther Lake).
		if name := strings.TrimSpace(frequencies[0].ModelName); name != "" {
			cpuData.Name = &name
		}
		if vendor := strings.TrimSpace(frequencies[0].VendorID); vendor != "" {
			cpuData.Vendor = &vendor
		}
		if family := strings.TrimSpace(frequencies[0].Family); family != "" {
			cpuData.Family = &family
		}

		freq := types.CPUFrequency{
			Current: &frequencies[0].Mhz,
		}
		// Overall min is the minimum of per-CPU mins and overall max the
		// maximum of per-CPU maxes.
		for _, b := range freqBounds {
			if b.Min != nil && (freq.Min == nil || *b.Min < *freq.Min) {
				freq.Min = b.Min
			}
			if b.Max != nil && (freq.Max == nil || *b.Max > *freq.Max) {
				freq.Max = b.Max
			}
		}
		cpuData.Frequency = &freq
	}

	// Fetch per-CPU and overall times and usage once. A zero interval
	// returns usage since the previous update instead of sleeping.
	timesPerCPU, _ := cpu.TimesWithContext(ctx, true)
	percentsPerCPU, _ := cpu.PercentWithContext(ctx, 0, true)
	overallTimes, overallTimesErr := cpu.TimesWithContext(ctx, false)
	if percents, err := cpu.PercentWithContext(ctx, 0, false); err == nil && len(percents) > 0 {
		usage := percents[0]
		cpuData.Usage = &usage
	}

	// Get load average where supported (Unix systems)
	if load, err := load.Avg(); err == nil {
		load1, load5, load15 := load.Load1, load.Load5, load.Load15
		cpuData.LoadAverage = &load1
		cpuData.LoadAverage5 = &load5
		cpuData.LoadAverage15 = &load15
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
		cpuData.Temperature = cm.ReadCPUTemperature()
	}

	// CPU statistics and voltage (OS-specific best-effort)
	cpuData.Stats = cm.ReadCPUStats()
	cpuData.Voltage = cm.ReadCPUVcoreVoltage()

	sampleWG.Wait()

	cpuData.Power = overallPower

	// Distribute overall package power across cores weighted by usage
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
		} else if count > 0 {
			// Fallback to equal distribution
			for i := range perCorePowers {
				perCorePowers[i] = (*overallPower) / float64(count)
			}
		}
	}

	// Get per CPU info - loop based on actual CPU count, not frequencies array length
	perCPU := make([]types.PerCPU, 0, count)
	for i := 0; i < count; i++ {
		perCpuData := types.PerCPU{
			ID: i,
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
			if i < len(freqBounds) {
				perCpuData.Frequency.Min = freqBounds[i].Min
				perCpuData.Frequency.Max = freqBounds[i].Max
			}
		}

		if i < len(timesPerCPU) {
			var pct *types.CPUTimes
			if i < len(perPct) {
				pct = perPct[i]
			}
			var dpcPct *float64
			if i < len(dpc.PerCPUPercent) {
				dpcPct = &dpc.PerCPUPercent[i]
			}
			perCpuData.Times, perCpuData.TimesPercent = buildCPUTimes(timesPerCPU[i], pct, dpcPct, dpc)
		}

		// Get per CPU usage percentage
		if i < len(percentsPerCPU) {
			usage := percentsPerCPU[i]
			perCpuData.Usage = &usage
		}

		if i < len(perCorePowers) {
			val := perCorePowers[i]
			perCpuData.Power = &val
		}

		perCPU = append(perCPU, perCpuData)
	}
	cpuData.PerCPU = perCPU

	// Overall CPU times, with the percent from the same sample as the
	// per-CPU values
	if overallTimesErr == nil && len(overallTimes) > 0 {
		cpuData.Times, cpuData.TimesPercent = buildCPUTimes(overallTimes[0], overallPct, dpc.TotalPercent, dpc)
	}

	return cpuData, nil
}

// buildCPUTimes assembles the absolute and percentage time breakdowns for
// one CPU, or for the whole system, from a times snapshot, the sampled
// percentages and the Windows DPC percentage when available.
func buildCPUTimes(stat cpu.TimesStat, pct *types.CPUTimes, dpcPct *float64, dpc cm.DPCSample) (*types.CPUTimes, *types.CPUTimes) {
	times := &types.CPUTimes{
		User:      &stat.User,
		System:    &stat.System,
		Idle:      &stat.Idle,
		Interrupt: &stat.Irq,
	}
	var timesPercent *types.CPUTimes
	if pct != nil {
		timesPercent = &types.CPUTimes{
			User:      pct.User,
			System:    pct.System,
			Idle:      pct.Idle,
			Interrupt: pct.Interrupt,
		}
	}
	if dpcPct != nil {
		secs := dpc.Seconds(*dpcPct)
		times.DPC = &secs
		if timesPercent == nil {
			timesPercent = &types.CPUTimes{}
		}
		d := *dpcPct
		timesPercent.DPC = &d
	}
	return times, timesPercent
}

// computeTimesPercent calculates per-state CPU time percentages over one
// sampling window. It returns one entry per CPU and the overall value,
// which is derived from the same two snapshots rather than sampled again.
func computeTimesPercent(sample time.Duration) ([]*types.CPUTimes, *types.CPUTimes) {
	t1, err := cpu.Times(true)
	if err != nil || len(t1) == 0 {
		return nil, nil
	}
	time.Sleep(sample)
	t2, err := cpu.Times(true)
	if err != nil || len(t2) == 0 || len(t2) != len(t1) {
		return nil, nil
	}

	out := make([]*types.CPUTimes, 0, len(t2))
	var sum1, sum2 cpu.TimesStat
	for i := range t2 {
		out = append(out, timesPercentDelta(t1[i], t2[i]))
		addTimes(&sum1, t1[i])
		addTimes(&sum2, t2[i])
	}
	return out, timesPercentDelta(sum1, sum2)
}

// timesPercentDelta converts two CPU time snapshots into the share of the
// interval spent in each state.
func timesPercentDelta(t1, t2 cpu.TimesStat) *types.CPUTimes {
	// Total delta across all accounted fields (align with gopsutil Total)
	dTot := timesTotal(t2) - timesTotal(t1)
	if dTot <= 0 {
		return &types.CPUTimes{}
	}
	u := ((t2.User - t1.User) / dTot) * 100
	s := ((t2.System - t1.System) / dTot) * 100
	id := ((t2.Idle - t1.Idle) / dTot) * 100
	irq := ((t2.Irq - t1.Irq) / dTot) * 100
	return &types.CPUTimes{User: &u, System: &s, Idle: &id, Interrupt: &irq}
}

func timesTotal(t cpu.TimesStat) float64 {
	return t.User + t.System + t.Idle + t.Nice + t.Iowait + t.Irq + t.Softirq + t.Steal + t.Guest + t.GuestNice
}

func addTimes(dst *cpu.TimesStat, t cpu.TimesStat) {
	dst.User += t.User
	dst.System += t.System
	dst.Idle += t.Idle
	dst.Nice += t.Nice
	dst.Iowait += t.Iowait
	dst.Irq += t.Irq
	dst.Softirq += t.Softirq
	dst.Steal += t.Steal
	dst.Guest += t.Guest
	dst.GuestNice += t.GuestNice
}
