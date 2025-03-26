package data_module

import "errors"

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
	return nil, errors.New("not implemented")
}
