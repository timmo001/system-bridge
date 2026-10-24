package data

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"sync"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// historyWindow is how far back the history goes
const historyWindow = 24 * time.Hour

// counter is a counter's last reading, to turn the next into a rate
type counter struct {
	time  int64
	value float64
}

// History keeps the recent readings of the graphed metrics in memory, and
// saves them to disk so a restart doesn't lose them.
type History struct {
	mu       sync.Mutex
	metrics  types.MetricHistory
	counters map[string]counter
	// dirty is set when there are readings that haven't been saved
	dirty bool

	// saveMu stops two saves writing the same file at once
	saveMu sync.Mutex
}

func historyFile() (string, error) {
	dataPath, err := utils.GetDataPath()
	if err != nil {
		return "", fmt.Errorf("could not get data path: %w", err)
	}
	return filepath.Join(dataPath, "history.json"), nil
}

// NewHistory loads the saved history, dropping readings older than the
// window. A missing or unreadable file starts an empty history.
func NewHistory() *History {
	h := &History{counters: make(map[string]counter)}

	file, err := historyFile()
	if err != nil {
		slog.Warn("Could not find the history file", "error", err)
		return h
	}

	b, err := os.ReadFile(file)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			slog.Warn("Could not read the history file", "error", err)
		}
		return h
	}

	if err := json.Unmarshal(b, &h.metrics); err != nil {
		slog.Warn("Could not decode the history file", "error", err)
		h.metrics = types.MetricHistory{}
		return h
	}

	h.trim(time.Now().Add(-historyWindow).UnixMilli())

	return h
}

// push adds a reading to a series, skipping values that aren't known
func push(series []types.HistorySample, time int64, value *float64) []types.HistorySample {
	if value == nil || math.IsNaN(*value) || math.IsInf(*value, 0) {
		return series
	}
	return append(series, types.HistorySample{Time: time, Value: *value})
}

// rate is how fast a counter rose since its last reading, in units per
// second. It is nil for the first reading, and when the counter went down,
// such as after a resume.
func (h *History) rate(key string, time int64, value float64, ok bool) *float64 {
	if !ok {
		return nil
	}

	previous, seen := h.counters[key]
	h.counters[key] = counter{time: time, value: value}

	if !seen || time <= previous.time || value < previous.value {
		return nil
	}

	rate := (value - previous.value) * 1000 / float64(time-previous.time)
	return &rate
}

// Record adds the readings in a module's new data. Modules that aren't
// graphed are ignored.
func (h *History) Record(data any, now time.Time) {
	if h == nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	ms := now.UnixMilli()
	m := &h.metrics

	switch v := data.(type) {
	case types.CPUData:
		m.CPU = push(m.CPU, ms, v.Usage)
		m.CPUTemperature = push(m.CPUTemperature, ms, v.Temperature)
		if v.Frequency != nil {
			m.CPUFrequency = push(m.CPUFrequency, ms, v.Frequency.Current)
		}
		m.CPUPower = push(m.CPUPower, ms, v.Power)
		m.LoadAverage = push(m.LoadAverage, ms, v.LoadAverage)
	case types.SystemData:
		m.SystemPower = push(m.SystemPower, ms, v.PowerUsage)
	case types.SensorsData:
		for _, sensor := range v.Temperatures {
			m.Temperatures = pushKeyed(m.Temperatures, sensor.SensorKey, ms, &sensor.Temperature)
		}
		for _, fan := range v.Fans {
			m.Fans = pushKeyed(m.Fans, fan.SensorKey, ms, fan.SpeedRPM)
		}
	case types.MemoryData:
		if v.Virtual != nil {
			m.Memory = push(m.Memory, ms, v.Virtual.Percent)
		}
		if v.Swap != nil {
			m.Swap = push(m.Swap, ms, v.Swap.Percent)
		}
	case types.BatteryData:
		m.Battery = push(m.Battery, ms, v.Percentage)
	case types.NetworksData:
		var received, sent float64
		var hasReceived, hasSent bool
		if v.IO != nil && v.IO.BytesRecv != nil {
			received, hasReceived = float64(*v.IO.BytesRecv), true
		}
		if v.IO != nil && v.IO.BytesSent != nil {
			sent, hasSent = float64(*v.IO.BytesSent), true
		}
		m.NetworkReceive = push(m.NetworkReceive, ms, h.rate("network-receive", ms, received, hasReceived))
		m.NetworkSend = push(m.NetworkSend, ms, h.rate("network-send", ms, sent, hasSent))
	case types.DisksData:
		var read, write float64
		if v.IOCounters != nil {
			read, write = float64(v.IOCounters.ReadBytes), float64(v.IOCounters.WriteBytes)
		}
		m.DiskRead = push(m.DiskRead, ms, h.rate("disk-read", ms, read, v.IOCounters != nil))
		m.DiskWrite = push(m.DiskWrite, ms, h.rate("disk-write", ms, write, v.IOCounters != nil))
		for _, disk := range v.Devices {
			m.DiskTemperatures = pushKeyed(m.DiskTemperatures, disk.Name, ms, disk.Temperature)
		}
	case types.GPUsData:
		for _, gpu := range v {
			index := -1
			for i := range m.GPUs {
				if m.GPUs[i].ID == gpu.ID {
					index = i
					break
				}
			}
			if index == -1 {
				m.GPUs = append(m.GPUs, types.GPUHistory{ID: gpu.ID})
				index = len(m.GPUs) - 1
			}

			// The web client works memory load out from used and total
			// when it can, so the graph matches its gauge
			memoryLoad := gpu.MemoryLoad
			if gpu.MemoryUsed != nil && gpu.MemoryTotal != nil && *gpu.MemoryTotal > 0 {
				load := *gpu.MemoryUsed / *gpu.MemoryTotal * 100
				memoryLoad = &load
			}

			g := &m.GPUs[index]
			g.CoreLoad = push(g.CoreLoad, ms, gpu.CoreLoad)
			g.MemoryLoad = push(g.MemoryLoad, ms, memoryLoad)
			g.Temperature = push(g.Temperature, ms, gpu.Temperature)
			g.Power = push(g.Power, ms, gpu.PowerUsage)
		}
	default:
		return
	}

	h.trim(ms - historyWindow.Milliseconds())
	h.dirty = true
}

// after returns the readings after a time. Readings are in time order, so
// it searches rather than scanning.
func after(series []types.HistorySample, time int64) []types.HistorySample {
	i := sort.Search(len(series), func(i int) bool { return series[i].Time > time })
	return series[i:]
}

// pushKeyed adds a reading to the series with this ID, adding the series
// when it is new
func pushKeyed(list []types.SeriesHistory, id string, time int64, value *float64) []types.SeriesHistory {
	for i := range list {
		if list[i].ID == id {
			list[i].Samples = push(list[i].Samples, time, value)
			return list
		}
	}
	if samples := push(nil, time, value); len(samples) > 0 {
		list = append(list, types.SeriesHistory{ID: id, Samples: samples})
	}
	return list
}

// mapSeries applies f to every series. Sensors, disks and GPUs left with no
// readings are dropped.
func mapSeries(m types.MetricHistory, f func([]types.HistorySample) []types.HistorySample) types.MetricHistory {
	keyed := func(list []types.SeriesHistory) []types.SeriesHistory {
		mapped := make([]types.SeriesHistory, 0, len(list))
		for _, series := range list {
			if samples := f(series.Samples); len(samples) > 0 {
				mapped = append(mapped, types.SeriesHistory{ID: series.ID, Samples: samples})
			}
		}
		return mapped
	}

	gpus := make([]types.GPUHistory, 0, len(m.GPUs))
	for _, gpu := range m.GPUs {
		mapped := types.GPUHistory{
			ID:          gpu.ID,
			CoreLoad:    f(gpu.CoreLoad),
			MemoryLoad:  f(gpu.MemoryLoad),
			Temperature: f(gpu.Temperature),
			Power:       f(gpu.Power),
		}
		if len(mapped.CoreLoad)+len(mapped.MemoryLoad)+len(mapped.Temperature)+len(mapped.Power) > 0 {
			gpus = append(gpus, mapped)
		}
	}

	return types.MetricHistory{
		CPU:              f(m.CPU),
		CPUTemperature:   f(m.CPUTemperature),
		CPUFrequency:     f(m.CPUFrequency),
		CPUPower:         f(m.CPUPower),
		LoadAverage:      f(m.LoadAverage),
		Memory:           f(m.Memory),
		Swap:             f(m.Swap),
		Battery:          f(m.Battery),
		SystemPower:      f(m.SystemPower),
		NetworkReceive:   f(m.NetworkReceive),
		NetworkSend:      f(m.NetworkSend),
		DiskRead:         f(m.DiskRead),
		DiskWrite:        f(m.DiskWrite),
		DiskTemperatures: keyed(m.DiskTemperatures),
		GPUs:             gpus,
		Temperatures:     keyed(m.Temperatures),
		Fans:             keyed(m.Fans),
	}
}

// trim drops readings at or before the cutoff
func (h *History) trim(cutoff int64) {
	h.metrics = mapSeries(h.metrics, func(series []types.HistorySample) []types.HistorySample {
		return after(series, cutoff)
	})
}

// historyModules are the modules whose readings the history keeps
var historyModules = []types.ModuleName{
	types.ModuleBattery,
	types.ModuleCPU,
	types.ModuleDisks,
	types.ModuleGPUs,
	types.ModuleMemory,
	types.ModuleNetworks,
	types.ModuleSensors,
	types.ModuleSystem,
}

// HistoryModules are the modules whose readings the history keeps, to filter
// it by
func HistoryModules() []types.ModuleName {
	return slices.Clone(historyModules)
}

// HasHistory is whether the history keeps a module's readings
func HasHistory(module types.ModuleName) bool {
	return slices.Contains(historyModules, module)
}

// onlyModules empties the series of every module not listed. Emptied series
// stay as empty lists, so the history keeps its shape.
func onlyModules(m types.MetricHistory, modules []types.ModuleName) types.MetricHistory {
	filtered := mapSeries(m, func([]types.HistorySample) []types.HistorySample {
		return []types.HistorySample{}
	})
	keep := func(module types.ModuleName) bool { return slices.Contains(modules, module) }

	if keep(types.ModuleCPU) {
		filtered.CPU, filtered.CPUTemperature, filtered.CPUFrequency = m.CPU, m.CPUTemperature, m.CPUFrequency
		filtered.CPUPower, filtered.LoadAverage = m.CPUPower, m.LoadAverage
	}
	if keep(types.ModuleMemory) {
		filtered.Memory, filtered.Swap = m.Memory, m.Swap
	}
	if keep(types.ModuleBattery) {
		filtered.Battery = m.Battery
	}
	if keep(types.ModuleSystem) {
		filtered.SystemPower = m.SystemPower
	}
	if keep(types.ModuleNetworks) {
		filtered.NetworkReceive, filtered.NetworkSend = m.NetworkReceive, m.NetworkSend
	}
	if keep(types.ModuleDisks) {
		filtered.DiskRead, filtered.DiskWrite, filtered.DiskTemperatures = m.DiskRead, m.DiskWrite, m.DiskTemperatures
	}
	if keep(types.ModuleGPUs) {
		filtered.GPUs = m.GPUs
	}
	if keep(types.ModuleSensors) {
		filtered.Temperatures, filtered.Fans = m.Temperatures, m.Fans
	}

	return filtered
}

// Since copies the readings taken after a time, in Unix milliseconds. Zero
// copies them all. With modules, only those modules' readings are copied.
func (h *History) Since(since int64, modules ...types.ModuleName) types.MetricHistory {
	if h == nil {
		return types.MetricHistory{}
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	copied := h.since(since)
	if len(modules) == 0 {
		return copied
	}
	return onlyModules(copied, modules)
}

func (h *History) since(since int64) types.MetricHistory {
	return mapSeries(h.metrics, func(series []types.HistorySample) []types.HistorySample {
		return append([]types.HistorySample{}, after(series, since)...)
	})
}

// Save writes the history to disk when it has readings that haven't been
// saved. It encodes a copy, so recording isn't held up by the write.
func (h *History) Save() error {
	if h == nil {
		return nil
	}

	h.saveMu.Lock()
	defer h.saveMu.Unlock()

	h.mu.Lock()
	if !h.dirty {
		h.mu.Unlock()
		return nil
	}
	metrics := h.since(0)
	h.dirty = false
	h.mu.Unlock()

	if err := writeHistory(metrics); err != nil {
		h.mu.Lock()
		h.dirty = true
		h.mu.Unlock()
		return err
	}

	return nil
}

func writeHistory(metrics types.MetricHistory) error {
	file, err := historyFile()
	if err != nil {
		return err
	}

	b, err := json.Marshal(metrics)
	if err != nil {
		return fmt.Errorf("error encoding history: %w", err)
	}

	tmp := file + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return fmt.Errorf("error writing history: %w", err)
	}
	if err := os.Rename(tmp, file); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("error writing history: %w", err)
	}

	return nil
}

// SaveEvery saves the history at each interval until the context is done
func (h *History) SaveEvery(ctx context.Context, interval time.Duration) {
	if h == nil {
		return
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := h.Save(); err != nil {
				slog.Warn("Failed to save history", "error", err)
			}
		case <-ctx.Done():
			return
		}
	}
}
