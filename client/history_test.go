package client

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
)

// The CSV columns, names and units are shared with the TypeScript and
// Python connectors' exports, so this pins them down.
func TestWriteHistoryCSV(t *testing.T) {
	history := types.MetricHistory{
		CPU:          []types.HistorySample{{Time: 1700000000000, Value: 12.5}},
		NetworkSend:  []types.HistorySample{{Time: 1700000060000, Value: 2048}},
		GPUs:         []types.GPUHistory{{ID: "gpu0", Temperature: []types.HistorySample{{Time: 1700000000000, Value: 48}}}},
		Fans:         []types.SeriesHistory{{ID: "fan1", Samples: []types.HistorySample{{Time: 1700000000000, Value: 1200}}}},
		LoadAverage:  []types.HistorySample{{Time: 1700000000000, Value: 1.25}},
		Temperatures: []types.SeriesHistory{},
	}

	var out strings.Builder
	require.NoError(t, WriteHistoryCSV(&out, history))

	assert.Equal(t, strings.Join([]string{
		"time,metric,id,value,unit",
		"2023-11-14T22:13:20.000Z,cpu,,12.5,%",
		"2023-11-14T22:13:20.000Z,load_average,,1.25,",
		"2023-11-14T22:14:20.000Z,network_send,,2048,B/s",
		"2023-11-14T22:13:20.000Z,gpu_temperature,gpu0,48,°C",
		"2023-11-14T22:13:20.000Z,fan,fan1,1200,RPM",
		"",
	}, "\n"), out.String())
}

func TestExportHistory_UnknownFormat(t *testing.T) {
	err := ExportHistory(t.Context(), &strings.Builder{}, "xml", 0)
	assert.ErrorContains(t, err, `unknown format "xml"`)
}
