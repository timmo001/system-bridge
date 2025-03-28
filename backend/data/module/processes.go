package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateProcessesModule() (types.ProcessesData, error) {
	log.Info("Getting processes data")

	var processesData types.ProcessesData
	// Initialize arrays
	processesData.Processes = make([]types.Process, 0)

	// TODO: Implement
	return processesData, nil
}
