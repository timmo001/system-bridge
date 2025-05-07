package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/media"
	"github.com/timmo001/system-bridge/types"
)

type MediaModule struct{}

func (mm MediaModule) Name() types.ModuleName { return types.ModuleMedia }
func (mm MediaModule) Update(ctx context.Context) (any, error) {
	log.Info("Getting media data")
	return media.GetMediaData()
}
