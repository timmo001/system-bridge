package data_module

import (
	"context"
	"log/slog"
	"time"

	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/process"
	"github.com/timmo001/system-bridge/types"
)

type ProcessModule struct{}

func (pm ProcessModule) Name() types.ModuleName { return types.ModuleProcesses }
func (pm ProcessModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting processes data")

	processesData := make([]types.Process, 0)

	// Get process list
	processes, err := process.ProcessesWithContext(ctx)
	if err != nil {
		slog.Error("Failed to get processes", "error", err)
		return processesData, err
	}

	// Total memory is read once for the whole scan. The library's per-process
	// memory percentage re-reads it for every process.
	var totalMemory uint64
	if vm, err := mem.VirtualMemoryWithContext(ctx); err == nil {
		totalMemory = vm.Total
	}

	now := time.Now()

	// Process each process
	for _, p := range processes {
		proc := types.Process{
			ID: float64(p.Pid),
		}

		// Status is read first: on Linux it also fills the name, so the name
		// below comes from the same read.
		statusSlice, err := p.StatusWithContext(ctx)
		if err == nil && len(statusSlice) > 0 {
			status := statusSlice[0]
			proc.Status = &status
		}

		// Get process name
		name, err := p.NameWithContext(ctx)
		if err == nil {
			proc.Name = &name
		}

		// Get creation time (cached by the library when the process was listed)
		createTime, createErr := p.CreateTimeWithContext(ctx)
		if createErr == nil {
			createTimeFloat := float64(createTime) / 1000.0
			proc.Created = &createTimeFloat
		}

		// CPU usage since the process started, as the library computes it,
		// but reusing the cached creation time instead of reading the
		// process stat file twice more.
		if times, err := p.TimesWithContext(ctx); err == nil && createErr == nil {
			cpuPercent := 0.0
			if elapsed := now.Sub(time.UnixMilli(createTime)).Seconds(); elapsed > 0 {
				cpuPercent = 100 * times.Total() / elapsed
			}
			proc.CPUUsage = &cpuPercent
		}

		// Memory usage as a fraction of total memory
		if memInfo, err := p.MemoryInfoWithContext(ctx); err == nil && totalMemory > 0 {
			memPercent := float64(memInfo.RSS) / float64(totalMemory)
			proc.MemoryUsage = &memPercent
		}

		// Get executable path
		exePath, err := p.ExeWithContext(ctx)
		if err == nil {
			proc.Path = &exePath
		}

		// Get username
		username, err := processUsername(p)
		if err == nil {
			proc.Username = &username
		}

		// Get working directory
		cwd, err := p.CwdWithContext(ctx)
		if err == nil {
			proc.WorkingDirectory = &cwd
		}

		// Add process to data
		processesData = append(processesData, proc)
	}

	return processesData, nil
}
