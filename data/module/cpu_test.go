package data_module

import (
	"testing"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	cm "github.com/timmo001/system-bridge/data/module/cpu"
	"github.com/timmo001/system-bridge/types"
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

func TestBuildCPUTimesWithDPC(t *testing.T) {
	stat := cpu.TimesStat{User: 1, System: 2, Idle: 3, Irq: 4}
	dpcPct := 5.0
	sample := cm.DPCSample{Window: 2 * time.Second}

	times, pct := buildCPUTimes(stat, nil, &dpcPct, sample)
	if *times.User != 1 || *times.System != 2 || *times.Idle != 3 || *times.Interrupt != 4 {
		t.Fatalf("times = %+v", times)
	}
	if times.DPC == nil || *times.DPC != 0.1 {
		t.Fatalf("dpc seconds = %v, want 0.1", times.DPC)
	}
	if pct == nil || pct.DPC == nil || *pct.DPC != 5 || pct.User != nil {
		t.Fatalf("times percent = %+v", pct)
	}
}

func TestBuildCPUTimesWithoutDPC(t *testing.T) {
	user := 50.0
	times, pct := buildCPUTimes(cpu.TimesStat{}, &types.CPUTimes{User: &user}, nil, cm.DPCSample{})
	if times.DPC != nil {
		t.Fatalf("expected no dpc seconds, got %v", *times.DPC)
	}
	if pct == nil || pct.User == nil || *pct.User != 50 || pct.DPC != nil {
		t.Fatalf("times percent = %+v", pct)
	}
}
