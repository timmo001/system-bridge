package data

import (
	data_module "github.com/timmo001/system-bridge/backend/data/module"
)

type DataStore struct {
	Battery   data_module.Module
	CPU       data_module.Module
	Disks     data_module.Module
	Displays  data_module.Module
	GPUs      data_module.Module
	Media     data_module.Module
	Memory    data_module.Module
	Networks  data_module.Module
	Processes data_module.Module
	Sensors   data_module.Module
	System    data_module.Module
}

func NewDataStore() *DataStore {
	return &DataStore{
		Battery:   data_module.Module{Module: data_module.ModuleBattery},
		CPU:       data_module.Module{Module: data_module.ModuleCPU},
		Disks:     data_module.Module{Module: data_module.ModuleDisks},
		Displays:  data_module.Module{Module: data_module.ModuleDisplays},
		GPUs:      data_module.Module{Module: data_module.ModuleGPUs},
		Media:     data_module.Module{Module: data_module.ModuleMedia},
		Memory:    data_module.Module{Module: data_module.ModuleMemory},
		Networks:  data_module.Module{Module: data_module.ModuleNetworks},
		Processes: data_module.Module{Module: data_module.ModuleProcesses},
		Sensors:   data_module.Module{Module: data_module.ModuleSensors},
		System:    data_module.Module{Module: data_module.ModuleSystem},
	}
}

func (d *DataStore) GetModule(module data_module.ModuleName) *data_module.Module {
	switch module {
	case data_module.ModuleBattery:
		return &d.Battery
	case data_module.ModuleCPU:
		return &d.CPU
	case data_module.ModuleDisks:
		return &d.Disks
	case data_module.ModuleDisplays:
		return &d.Displays
	case data_module.ModuleGPUs:
		return &d.GPUs
	case data_module.ModuleMedia:
		return &d.Media
	case data_module.ModuleMemory:
		return &d.Memory
	case data_module.ModuleNetworks:
		return &d.Networks
	case data_module.ModuleProcesses:
		return &d.Processes
	case data_module.ModuleSensors:
		return &d.Sensors
	case data_module.ModuleSystem:
		return &d.System
	default:
		return nil
	}
}

func (d *DataStore) GetModuleData(module data_module.ModuleName) any {
	m := d.GetModule(module)
	if m == nil {
		return nil
	}

	return m.Data
}

func (d *DataStore) SetModuleData(module data_module.ModuleName, data any) {
	m := d.GetModule(module)
	if m == nil {
		return
	}

	m.Data = data
}

func (d *DataStore) GetAllModuleData() map[data_module.ModuleName]any {
	data := make(map[data_module.ModuleName]any)

	// Collect data from each module using the GetModule method
	for _, moduleName := range []data_module.ModuleName{
		data_module.ModuleBattery,
		data_module.ModuleCPU,
		data_module.ModuleDisks,
		data_module.ModuleDisplays,
		data_module.ModuleGPUs,
		data_module.ModuleMedia,
		data_module.ModuleMemory,
		data_module.ModuleNetworks,
		data_module.ModuleProcesses,
		data_module.ModuleSensors,
		data_module.ModuleSystem,
	} {
		module := d.GetModule(moduleName)
		if module != nil {
			data[moduleName] = module.Data
		}
	}

	return data
}
