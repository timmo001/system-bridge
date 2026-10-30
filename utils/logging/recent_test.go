package logging

import (
	"errors"
	"fmt"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRecentHandler(t *testing.T) {
	h := NewRecentHandler(3)
	logger := slog.New(h).With("module", "gpus")

	logger.Info("not kept")
	for i := range 4 {
		logger.Warn(fmt.Sprintf("warning %d", i), "error", errors.New("failed"))
	}
	logger.Error("last", "event", "GET_DATA")

	records := h.Records()
	require.Len(t, records, 3)
	assert.Equal(t, "warning 2", records[0].Message)
	assert.Equal(t, "warning 3", records[1].Message)

	last := records[2]
	assert.Equal(t, "last", last.Message)
	assert.Equal(t, "ERROR", last.Level)
	assert.Nil(t, last.Error)
	require.NotNil(t, last.Module)
	assert.Equal(t, "gpus", *last.Module)
	require.NotNil(t, last.Event)
	assert.Equal(t, "GET_DATA", *last.Event)

	require.NotNil(t, records[1].Error)
	assert.Equal(t, "failed", *records[1].Error)
}
