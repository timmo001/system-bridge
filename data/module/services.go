package data_module

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/services"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

// ServicesModule reads the services providers in the settings. With none it
// reports empty lists.
type ServicesModule struct{}

func (ServicesModule) Name() types.ModuleName { return types.ModuleServices }

func (ServicesModule) Update(ctx context.Context) (any, error) {
	cfg, err := settings.Load()
	if err != nil {
		return nil, fmt.Errorf("load settings: %w", err)
	}
	return services.Default.Read(ctx, cfg.Services.Providers), nil
}
