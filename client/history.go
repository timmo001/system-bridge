package client

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

// HistoryRow is one reading in an exported history
type HistoryRow struct {
	Time   time.Time
	Metric string
	// ID names which GPU, disk, sensor or fan, and is empty for the rest
	ID    string
	Value float64
	Unit  string
}

// HistoryCSVHeader is the first row of an exported CSV history
var HistoryCSVHeader = []string{"time", "metric", "id", "value", "unit"}

// FetchHistory gets the backend's history, only readings taken after since
// when it isn't zero.
func FetchHistory(ctx context.Context, since time.Time) (types.MetricHistory, error) {
	data := map[string]any{}
	if !since.IsZero() {
		data["since"] = since.UnixMilli()
	}

	raw, err := request(ctx, event.EventGetHistory, data)
	if err != nil {
		return types.MetricHistory{}, err
	}

	var history types.MetricHistory
	if err := json.Unmarshal(raw, &history); err != nil {
		return types.MetricHistory{}, fmt.Errorf("decode history: %w", err)
	}
	return history, nil
}

// ExportHistory writes the backend's history as "csv" or "json". A since
// above zero limits it to that long before now.
func ExportHistory(ctx context.Context, w io.Writer, format string, since time.Duration) error {
	write := WriteHistoryCSV
	switch format {
	case "csv":
	case "json":
		write = WriteHistoryJSON
	default:
		return fmt.Errorf("unknown format %q: use csv or json", format)
	}

	var from time.Time
	if since > 0 {
		from = time.Now().Add(-since)
	}

	history, err := FetchHistory(ctx, from)
	if err != nil {
		return err
	}
	return write(w, history)
}

// HistoryRows flattens a history into one row per reading, a metric at a
// time, each oldest first.
func HistoryRows(history types.MetricHistory) []HistoryRow {
	rows := []HistoryRow{}
	add := func(metric, id, unit string, samples []types.HistorySample) {
		for _, sample := range samples {
			rows = append(rows, HistoryRow{
				Time:   time.UnixMilli(sample.Time).UTC(),
				Metric: metric,
				ID:     id,
				Value:  sample.Value,
				Unit:   unit,
			})
		}
	}
	addEach := func(metric, unit string, list []types.SeriesHistory) {
		for _, series := range list {
			add(metric, series.ID, unit, series.Samples)
		}
	}

	add("cpu", "", "%", history.CPU)
	add("cpu_temperature", "", "°C", history.CPUTemperature)
	add("cpu_frequency", "", "MHz", history.CPUFrequency)
	add("cpu_power", "", "W", history.CPUPower)
	add("load_average", "", "", history.LoadAverage)
	add("memory", "", "%", history.Memory)
	add("swap", "", "%", history.Swap)
	add("battery", "", "%", history.Battery)
	add("system_power", "", "W", history.SystemPower)
	add("network_receive", "", "B/s", history.NetworkReceive)
	add("network_send", "", "B/s", history.NetworkSend)
	add("disk_read", "", "B/s", history.DiskRead)
	add("disk_write", "", "B/s", history.DiskWrite)
	addEach("disk_temperature", "°C", history.DiskTemperatures)
	for _, gpu := range history.GPUs {
		add("gpu_core_load", gpu.ID, "%", gpu.CoreLoad)
		add("gpu_memory_load", gpu.ID, "%", gpu.MemoryLoad)
		add("gpu_temperature", gpu.ID, "°C", gpu.Temperature)
		add("gpu_power", gpu.ID, "W", gpu.Power)
	}
	addEach("temperature", "°C", history.Temperatures)
	addEach("fan", "RPM", history.Fans)

	return rows
}

// WriteHistoryCSV writes a history as CSV, one row per reading
func WriteHistoryCSV(w io.Writer, history types.MetricHistory) error {
	writer := csv.NewWriter(w)
	if err := writer.Write(HistoryCSVHeader); err != nil {
		return fmt.Errorf("write history: %w", err)
	}
	for _, row := range HistoryRows(history) {
		if err := writer.Write([]string{
			row.Time.Format("2006-01-02T15:04:05.000Z"),
			row.Metric,
			row.ID,
			strconv.FormatFloat(row.Value, 'f', -1, 64),
			row.Unit,
		}); err != nil {
			return fmt.Errorf("write history: %w", err)
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return fmt.Errorf("write history: %w", err)
	}
	return nil
}

// WriteHistoryJSON writes a history as indented JSON, in the shape
// GET_HISTORY returns
func WriteHistoryJSON(w io.Writer, history types.MetricHistory) error {
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(history); err != nil {
		return fmt.Errorf("write history: %w", err)
	}
	return nil
}
