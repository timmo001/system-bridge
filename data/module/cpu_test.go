package data_module

import (
	"testing"

	"github.com/shirou/gopsutil/v4/cpu"
)

func TestTimesPercentDelta(t *testing.T) {
	t1 := cpu.TimesStat{User: 100, System: 50, Idle: 850}
	t2 := cpu.TimesStat{User: 150, System: 75, Idle: 925, Irq: 50}

	pct := timesPercentDelta(t1, t2)
	if pct.User == nil || *pct.User != 25 {
		t.Fatalf("user = %v, want 25", pct.User)
	}
	if pct.System == nil || *pct.System != 12.5 {
		t.Fatalf("system = %v, want 12.5", pct.System)
	}
	if pct.Idle == nil || *pct.Idle != 37.5 {
		t.Fatalf("idle = %v, want 37.5", pct.Idle)
	}
	if pct.Interrupt == nil || *pct.Interrupt != 25 {
		t.Fatalf("interrupt = %v, want 25", pct.Interrupt)
	}
}

func TestTimesPercentDeltaWithoutProgress(t *testing.T) {
	same := cpu.TimesStat{User: 1, System: 1, Idle: 1}
	pct := timesPercentDelta(same, same)
	if pct == nil || pct.User != nil || pct.Idle != nil {
		t.Fatalf("expected empty percentages, got %+v", pct)
	}
}

func TestAddTimesSumsEveryState(t *testing.T) {
	var sum cpu.TimesStat
	addTimes(&sum, cpu.TimesStat{User: 1, System: 2, Idle: 3, Nice: 4, Iowait: 5, Irq: 6, Softirq: 7, Steal: 8, Guest: 9, GuestNice: 10})
	addTimes(&sum, cpu.TimesStat{User: 1})
	if got := timesTotal(sum); got != 56 {
		t.Fatalf("total = %v, want 56", got)
	}
}
