package data_module

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
