package types

import "time"

// ModuleName represents the type of data module
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

// Module represents a data module
type Module struct {
	Module  ModuleName `json:"module" mapstructure:"module"`
	Updated time.Time  `json:"updated" mapstructure:"updated"`
	Data    any        `json:"data" mapstructure:"data"`
}
