package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/media"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateMediaModule() (types.MediaData, error) {
	log.Info("Getting media data")
	return media.GetMediaData()
}
