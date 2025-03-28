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
func (t *Module) Process() error {
	return errors.New("not implemented")
}

func (t *Module) UpdateModule() (any, error) {
	switch t.Module {
	case types.ModuleBattery:
		return t.UpdateBatteryModule()
	case types.ModuleCPU:
		return t.UpdateCPUModule()
	case types.ModuleDisks:
		return t.UpdateDisksModule()
	case types.ModuleDisplays:
		return t.UpdateDisplaysModule()
	case types.ModuleGPUs:
		return t.UpdateGPUsModule()
	case types.ModuleMedia:
		return t.UpdateMediaModule()
	case types.ModuleMemory:
		return t.UpdateMemoryModule()
	case types.ModuleNetworks:
		return t.UpdateNetworksModule()
	case types.ModuleProcesses:
		return t.UpdateProcessesModule()
	case types.ModuleSensors:
		return t.UpdateSensorsModule()
	case types.ModuleSystem:
		return t.UpdateSystemModule()
	default:
		return nil, fmt.Errorf("module not found: %s", t.Module)
	}
}
