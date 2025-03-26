package data_module

import (
	"fmt"
)

// Module represents the type of data module
type Module string

const (
	ModuleBattery   Module = "battery"
	ModuleCPU       Module = "cpu"
	ModuleDisks     Module = "disks"
	ModuleDisplays  Module = "displays"
	ModuleGPUs      Module = "gpus"
	ModuleMedia     Module = "media"
	ModuleMemory    Module = "memory"
	ModuleNetworks  Module = "networks"
	ModuleProcesses Module = "processes"
	ModuleSensors   Module = "sensors"
	ModuleSystem    Module = "system"
)

type UpdateTask struct {
	Module Module
	Data   any
}

func (t *UpdateTask) UpdateModule() (any, error) {
	switch t.Module {
	case ModuleBattery:
		return t.UpdateBatteryModule()
	case ModuleCPU:
		return t.UpdateCPUModule()
	case ModuleDisks:
		return t.UpdateDisksModule()
	case ModuleDisplays:
		return t.UpdateDisplaysModule()
	case ModuleGPUs:
		return t.UpdateGPUsModule()
	case ModuleMedia:
		return t.UpdateMediaModule()
	case ModuleMemory:
		return t.UpdateMemoryModule()
	case ModuleNetworks:
		return t.UpdateNetworksModule()
	case ModuleProcesses:
		return t.UpdateProcessesModule()
	case ModuleSensors:
		return t.UpdateSensorsModule()
	case ModuleSystem:
		return t.UpdateSystemModule()
	default:
		return nil, fmt.Errorf("module not found: %s", t.Module)
	}
}
