package data_module

import (
	"context"
	"log/slog"

	"github.com/timmo001/system-bridge/data/module/media"
	"github.com/timmo001/system-bridge/types"
)

type MediaModule struct{}

func (mm MediaModule) Name() types.ModuleName { return types.ModuleMedia }
func (mm MediaModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting media data")
	return media.GetMediaData()
}
