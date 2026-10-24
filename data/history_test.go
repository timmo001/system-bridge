package data

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

func networks(received, sent int64) types.NetworksData {
	return types.NetworksData{IO: &types.NetworkIO{BytesRecv: &received, BytesSent: &sent}}
}

func cpu(usage float64) types.CPUData {
	return types.CPUData{Usage: &usage}
}

func TestHistory_Record(t *testing.T) {
	start := time.UnixMilli(1_000_000_000_000)

	t.Run("Network rates from two readings", func(t *testing.T) {
		h := &History{counters: make(map[string]counter)}

		h.Record(networks(1000, 500), start)
		h.Record(networks(3000, 1500), start.Add(2*time.Second))

		m := h.Since(0)
		require.Len(t, m.NetworkReceive, 1)
		assert.Equal(t, 1000.0, m.NetworkReceive[0].Value)
		require.Len(t, m.NetworkSend, 1)
		assert.Equal(t, 500.0, m.NetworkSend[0].Value)
	})

	t.Run("No rate when a counter goes down", func(t *testing.T) {
		h := &History{counters: make(map[string]counter)}

		h.Record(networks(5000, 5000), start)
		h.Record(networks(100, 100), start.Add(time.Minute))
		h.Record(networks(700, 100), start.Add(2*time.Minute))

		m := h.Since(0)
		require.Len(t, m.NetworkReceive, 1)
		assert.Equal(t, 10.0, m.NetworkReceive[0].Value)
		assert.Equal(t, 0.0, m.NetworkSend[0].Value)
	})

	t.Run("Readings past the window are dropped", func(t *testing.T) {
		h := &History{counters: make(map[string]counter)}

		h.Record(cpu(10), start)
		h.Record(types.GPUsData{{ID: "gpu0", CoreLoad: new(float64)}}, start)
		h.Record(cpu(20), start.Add(historyWindow/2))
		h.Record(cpu(30), start.Add(historyWindow+time.Minute))

		m := h.Since(0)
		assert.Equal(t, []types.HistorySample{
			{Time: start.Add(historyWindow / 2).UnixMilli(), Value: 20},
			{Time: start.Add(historyWindow + time.Minute).UnixMilli(), Value: 30},
		}, m.CPU)
		assert.Empty(t, m.GPUs, "a GPU with no readings left is dropped")
	})

	t.Run("Sensors and GPUs keep a series each", func(t *testing.T) {
		h := &History{counters: make(map[string]counter)}
		used, total := 512.0, 2048.0
		rpm := 1200.0

		for i := range 2 {
			now := start.Add(time.Duration(i) * time.Minute)
			h.Record(types.SensorsData{
				Temperatures: []types.Temperature{{SensorKey: "a", Temperature: 40}, {SensorKey: "b", Temperature: 50}},
				Fans:         []types.Fan{{SensorKey: "fan1", SpeedRPM: &rpm}, {SensorKey: "fan2"}},
			}, now)
			h.Record(types.GPUsData{{ID: "gpu0", MemoryUsed: &used, MemoryTotal: &total}}, now)
		}

		m := h.Since(0)
		require.Len(t, m.Temperatures, 2)
		assert.Equal(t, "b", m.Temperatures[1].ID)
		assert.Len(t, m.Temperatures[1].Samples, 2)
		require.Len(t, m.Fans, 1, "a fan with no speed gets no series")
		require.Len(t, m.GPUs, 1)
		assert.Equal(t, 25.0, m.GPUs[0].MemoryLoad[0].Value, "memory load comes from used and total")
		assert.Empty(t, m.GPUs[0].CoreLoad)
	})

	t.Run("Since returns only newer readings", func(t *testing.T) {
		h := &History{counters: make(map[string]counter)}

		for i := range 5 {
			h.Record(cpu(float64(i)), start.Add(time.Duration(i)*time.Minute))
		}

		m := h.Since(start.Add(2 * time.Minute).UnixMilli())
		require.Len(t, m.CPU, 2)
		assert.Equal(t, 3.0, m.CPU[0].Value)
		assert.Equal(t, 4.0, m.CPU[1].Value)
	})
}

func TestHistory_SaveAndLoad(t *testing.T) {
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", t.TempDir())

	now := time.Now()
	old := types.HistorySample{Time: now.Add(-historyWindow - time.Hour).UnixMilli(), Value: 1}
	recent := types.HistorySample{Time: now.Add(-time.Hour).UnixMilli(), Value: 2}

	dataPath, err := utils.GetDataPath()
	require.NoError(t, err)
	b, err := json.Marshal(types.MetricHistory{CPU: []types.HistorySample{old, recent}})
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(dataPath, "history.json"), b, 0o600))

	h := NewHistory()
	assert.Equal(t, []types.HistorySample{recent}, h.Since(0).CPU)

	h.Record(cpu(3), now)
	require.NoError(t, h.Save())

	reloaded := NewHistory()
	assert.Len(t, reloaded.Since(0).CPU, 2)
}

// BenchmarkHistoryDay fills a day of readings, one a minute for every series,
// with two GPUs, two disks, ten temperature sensors and five fans, and
// reports the memory the history holds afterwards.
func BenchmarkHistoryDay(b *testing.B) {
	start := time.Now()
	readings := int(historyWindow / time.Minute)
	usage := 50.0
	gpu := func(id string) types.GPU {
		return types.GPU{ID: id, CoreLoad: &usage, MemoryLoad: &usage, Temperature: &usage, PowerUsage: &usage}
	}
	gpus := types.GPUsData{gpu("gpu0"), gpu("gpu1")}
	sensors := types.SensorsData{}
	for i := range 10 {
		sensors.Temperatures = append(sensors.Temperatures, types.Temperature{SensorKey: "temp" + strconv.Itoa(i), Temperature: usage})
	}
	for i := range 5 {
		sensors.Fans = append(sensors.Fans, types.Fan{SensorKey: "fan" + strconv.Itoa(i), SpeedRPM: &usage})
	}
	devices := []types.Disk{{Name: "nvme0n1", Temperature: &usage}, {Name: "sda", Temperature: &usage}}

	var heapBytes, sinceBytes float64

	for b.Loop() {
		runtime.GC()
		var before runtime.MemStats
		runtime.ReadMemStats(&before)

		h := &History{counters: make(map[string]counter)}
		// Two days, so trimming runs for the whole second day
		for i := range readings * 2 {
			now := start.Add(time.Duration(i) * time.Minute)
			total := int64(i) * 1000
			h.Record(types.CPUData{
				Usage: &usage, Temperature: &usage, Power: &usage, LoadAverage: &usage,
				Frequency: &types.CPUFrequency{Current: &usage},
			}, now)
			h.Record(types.SystemData{PowerUsage: &usage}, now)
			h.Record(sensors, now)
			h.Record(types.MemoryData{
				Virtual: &types.MemoryVirtual{Percent: &usage},
				Swap:    &types.MemorySwap{Percent: &usage},
			}, now)
			h.Record(types.BatteryData{Percentage: &usage}, now)
			h.Record(networks(total, total), now)
			h.Record(types.DisksData{Devices: devices, IOCounters: &types.DiskIOCounters{
				ReadBytes: uint64(total), WriteBytes: uint64(total),
			}}, now)
			h.Record(gpus, now)
		}

		runtime.GC()
		var after runtime.MemStats
		runtime.ReadMemStats(&after)
		heapBytes = float64(after.HeapAlloc) - float64(before.HeapAlloc)

		var beforeSince runtime.MemStats
		runtime.ReadMemStats(&beforeSince)
		_ = h.Since(0)
		var afterSince runtime.MemStats
		runtime.ReadMemStats(&afterSince)
		sinceBytes = float64(afterSince.TotalAlloc - beforeSince.TotalAlloc)

		runtime.KeepAlive(h)
	}

	b.ReportMetric(heapBytes, "live-B")
	b.ReportMetric(sinceBytes, "since-B")
}
