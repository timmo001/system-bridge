package data_module

import (
	"errors"
	"fmt"

	"github.com/timmo001/system-bridge/types"
)

// Redefined in types/module.go - Added to avoid compilerInvalidReceiver error
// Module represents the data module implementation
type Module struct {
	Module types.ModuleName `json:"module" mapstructure:"module"`
	Data   any              `json:"data" mapstructure:"data"`
}

// Process implements data.UpdateTask.
func (m *Module) Process() error {
	return errors.New("not implemented")
}

func (m *Module) updateModule() (any, error) {
	switch m.Module {
	case types.ModuleBattery:
		return m.UpdateBatteryModule()
	case types.ModuleCPU:
		return m.UpdateCPUModule()
	case types.ModuleDisks:
		return m.UpdateDisksModule()
	case types.ModuleDisplays:
		return m.UpdateDisplaysModule()
	case types.ModuleGPUs:
		return m.UpdateGPUsModule()
	case types.ModuleMedia:
		return m.UpdateMediaModule()
	case types.ModuleMemory:
		return m.UpdateMemoryModule()
	case types.ModuleNetworks:
		return m.UpdateNetworksModule()
	case types.ModuleProcesses:
		return m.UpdateProcessesModule()
	case types.ModuleSensors:
		return m.UpdateSensorsModule()
	case types.ModuleSystem:
		return m.UpdateSystemModule()
	default:
		return nil, fmt.Errorf("module not found: %s", m.Module)
	}
}

func (m *Module) UpdateModule() (Module, error) {
	d, err := m.updateModule()
	if err != nil {
		return Module{}, err
	}

	nm := Module{
		Module: m.Module,
		Data:   d,
	}

	// go update.UpdateModule(nm)

	return nm, nil
}
