package logging

import (
	"context"
	"log/slog"
	"sync"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// recentLimit is how many warnings and errors Recent keeps
const recentLimit = 20

// Recent keeps the latest warnings and errors in memory for diagnostics,
// whatever the configured log level
var Recent = NewRecentHandler(recentLimit)

type recentBuffer struct {
	mu      sync.Mutex
	limit   int
	records []types.DiagnosticsLogRecord
}

// RecentHandler is a slog.Handler that keeps the latest warnings and errors,
// with the home directory and user name masked
type RecentHandler struct {
	buffer *recentBuffer
	attrs  []slog.Attr
}

func NewRecentHandler(limit int) *RecentHandler {
	return &RecentHandler{buffer: &recentBuffer{limit: limit}}
}

func (h *RecentHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= slog.LevelWarn
}

func (h *RecentHandler) Handle(_ context.Context, r slog.Record) error {
	record := types.DiagnosticsLogRecord{
		Time:    r.Time.Unix(),
		Level:   r.Level.String(),
		Message: utils.MaskUserPaths(r.Message),
	}
	read := func(a slog.Attr) bool {
		value := utils.MaskUserPaths(a.Value.Resolve().String())
		switch a.Key {
		case "error", "err":
			record.Error = &value
		case "module":
			record.Module = &value
		case "event":
			record.Event = &value
		}
		return true
	}
	for _, a := range h.attrs {
		read(a)
	}
	r.Attrs(read)

	b := h.buffer
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.records) >= b.limit {
		b.records = append(b.records[:0], b.records[len(b.records)-b.limit+1:]...)
	}
	b.records = append(b.records, record)
	return nil
}

func (h *RecentHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &RecentHandler{buffer: h.buffer, attrs: append(h.attrs[:len(h.attrs):len(h.attrs)], attrs...)}
}

// WithGroup keeps the handler as is: the attributes it reads are top level
func (h *RecentHandler) WithGroup(string) slog.Handler {
	return h
}

// Records returns the kept warnings and errors, oldest first
func (h *RecentHandler) Records() []types.DiagnosticsLogRecord {
	b := h.buffer
	b.mu.Lock()
	defer b.mu.Unlock()
	return append(make([]types.DiagnosticsLogRecord, 0, len(b.records)), b.records...)
}
