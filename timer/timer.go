package timer

import (
	"context"
	"fmt"
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/logger"
)

type Timer struct {
	Channel     chan bool
	Logger      *log.Logger
	Cancel      context.CancelFunc
	TickHandler func()
}

func NewTimer(channel chan bool, name string, tickHandler func()) *Timer {
	l := logger.CreateLogger(fmt.Sprintf("timer-%s", name))
	return &Timer{
		Channel:     channel,
		Logger:      l,
		TickHandler: tickHandler,
	}
}

func (t *Timer) Start(interval time.Duration) {
	t.Logger.Info(fmt.Sprintf("Starting timer with interval: %v", interval))

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
	if t.TickHandler != nil {
		t.TickHandler()
	} else {
		t.Logger.Warn("No tick handler set")
	}
}

func (t *Timer) Stop() {
	if t.Cancel != nil {
		t.Cancel()
	}
}
