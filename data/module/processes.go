package data_module

import (
	"context"

	"log/slog"

	"github.com/shirou/gopsutil/v4/process"
	"github.com/timmo001/system-bridge/types"
)

type ProcessModule struct{}

func (pm ProcessModule) Name() types.ModuleName { return types.ModuleProcesses }
func (pm ProcessModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting processes data")

	processesData := make([]types.Process, 0)

	// Get process list
	processes, err := process.Processes()
	if err != nil {
		slog.Error("Failed to get processes", "error", err)
		return processesData, err
	}

	// Process each process
	for _, p := range processes {
		proc := types.Process{
			ID: float64(p.Pid),
		}

		// Get process name
		name, err := p.Name()
		if err == nil {
			proc.Name = &name
		}

		// Get CPU usage percentage
		cpuPercent, err := p.CPUPercent()
		if err == nil {
			proc.CPUUsage = &cpuPercent
		}

		// Get creation time
		createTime, err := p.CreateTime()
		if err == nil {
			createTimeFloat := float64(createTime) / 1000.0
			proc.Created = &createTimeFloat
		}

		// Get memory usage
		memInfo, err := p.MemoryPercent()
		if err == nil {
			memPercent := float64(memInfo) / 100.0 // Convert to decimal percentage
			proc.MemoryUsage = &memPercent
		}

		// Get executable path
		exePath, err := p.Exe()
		if err == nil {
			proc.Path = &exePath
		}

		// Get process status
		statusSlice, err := p.Status()
		if err == nil && len(statusSlice) > 0 {
			status := statusSlice[0]
			proc.Status = &status
		}

		// Get username
		username, err := p.Username()
		if err == nil {
			proc.Username = &username
		}

		// Get working directory
		cwd, err := p.Cwd()
		if err == nil {
			proc.WorkingDirectory = &cwd
		}

		// Add process to data
		processesData = append(processesData, proc)
	}

	return processesData, nil
}
