package types

import "context"

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

type Updater interface {
	Name() ModuleName
	Update(context.Context) (any, error)
}

// Module represents a data module
type Module struct {
	Name    ModuleName `json:"module" mapstructure:"module"`
	Updater Updater
	Data    any    `json:"data" mapstructure:"data"`
	Updated string `json:"updated" mapstructure:"updated"`
}
