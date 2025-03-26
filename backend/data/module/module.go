package data_module

import (
	"fmt"
)

// Module represents the type of data module
type ModuleName string

const (
	ModuleBattery   ModuleName = "battery"
	ModuleCPU       ModuleName = "cpu"
	ModuleDisks     ModuleName = "disks"
	ModuleDisplays  ModuleName = "displays"
	ModuleGPUs      ModuleName = "gpus"
	ModuleMedia     ModuleName = "media"
	ModuleMemory    ModuleName = "memory"
	ModuleNetworks  ModuleName = "networks"
	ModuleProcesses ModuleName = "processes"
	ModuleSensors   ModuleName = "sensors"
	ModuleSystem    ModuleName = "system"
)

type Module struct {
	Module ModuleName `json:"module" mapstructure:"module"`
	Data   any        `json:"data" mapstructure:"data"`
}

// Process implements data.UpdateTask.
func (t *Module) Process() error {
	panic("unimplemented")
}

func (t *Module) UpdateModule() (any, error) {
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
