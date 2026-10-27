package event_handler

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/system"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

const systemTimeout = 10 * time.Second

type SystemPowerProfileRequestData struct {
	// One of the system module's power_profiles, such as balanced
	Profile string `json:"profile" mapstructure:"profile"`
}

func RegisterSystemHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	registerAction(router, dataStore, types.ModuleSystem, systemTimeout, event.EventSystemSetPowerProfile, event.ResponseTypeSystemPowerProfileSet, "Power profile set",
		func(request SystemPowerProfileRequestData) string {
			return required(request.Profile, "No power profile provided")
		},
		func(ctx context.Context, request SystemPowerProfileRequestData) error {
			return system.SetPowerProfile(ctx, request.Profile)
		})
}
