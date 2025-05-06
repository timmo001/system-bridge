package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/media"
	"github.com/timmo001/system-bridge/types"
)

// MediaData represents media information
type MediaData struct{}

func (mediaData MediaData) Name() types.ModuleName { return types.ModuleMedia }
func (mediaData MediaData) Update(ctx context.Context) (any, error) {
	log.Info("Getting media data")
	return media.GetMediaData()
}
