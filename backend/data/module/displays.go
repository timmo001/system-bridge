package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data/module/displays"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateDisplaysModule() (types.DisplaysData, error) {
	log.Info("Getting displays data")

	var displaysData types.DisplaysData
	displaysData = make([]types.Display, 0)

	displays, err := displays.GetDisplays()
	if err != nil {
		log.Error("failed to get display info", "error", err)
		return displaysData, err
	}

	displaysData = displays
	return displaysData, nil
}
