package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data/module/displays"
	"github.com/timmo001/system-bridge/types"
)

// DisplaysData represents information about all display devices
type DisplaysData struct {
	Displays []types.Display `json:"displays"`
}

func (t *Module) UpdateDisplaysModule() (DisplaysData, error) {
	log.Info("Getting displays data")

	var displaysData DisplaysData
	displaysData.Displays = make([]types.Display, 0)

	displays, err := displays.GetDisplays()
	if err != nil {
		log.Error("failed to get display info", "error", err)
		return displaysData, err
	}

	displaysData.Displays = displays
	return displaysData, nil
}
