package timer

import (
	"context"
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/logger"
)

type Timer struct {
	Channel chan bool
	Logger  *log.Logger
	Cancel  context.CancelFunc
}

func NewTimer(channel chan bool) *Timer {
	l := logger.CreateLogger("Timer")
	return &Timer{
		Channel: channel,
		Logger:  l,
	}
}

func (t *Timer) Start(interval time.Duration) {
	ctx, cancel := context.WithCancel(context.Background())
	t.Cancel = cancel

	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				t.Logger.Warn("Timer stopped")
				return
			case <-ticker.C:
				t.Tick()
			}
		}
	}()

	t.Logger.Info("Timer started")
}

func (t *Timer) Tick() {
	t.Logger.Debug("Timer tick")
}

func (t *Timer) Stop() {
	if t.Cancel != nil {
		t.Cancel()
	}
}
