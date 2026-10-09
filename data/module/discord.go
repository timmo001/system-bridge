package data_module

import (
	"context"

	"github.com/timmo001/system-bridge/discord"
	"github.com/timmo001/system-bridge/types"
)

// DiscordModule reports the cached state. The Discord client pushes changes
// as they happen, so Update does not query Discord.
type DiscordModule struct{}

func (dm DiscordModule) Name() types.ModuleName { return types.ModuleDiscord }
func (dm DiscordModule) Update(ctx context.Context) (any, error) {
	return discord.State(), nil
}
