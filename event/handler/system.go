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

type SystemKeepAwakeRequestData struct {
	Enabled *bool `json:"enabled" mapstructure:"enabled"`
	// Seconds until the system may idle again. Leave it out, or 0, to keep
	// it awake until told otherwise.
	Duration *int `json:"duration,omitempty" mapstructure:"duration"`
}

func RegisterSystemHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	registerAction(router, dataStore, types.ModuleSystem, systemTimeout, event.EventSystemSetPowerProfile, event.ResponseTypeSystemPowerProfileSet, "Power profile set",
		func(request SystemPowerProfileRequestData) string {
			return required(request.Profile, "No power profile provided")
		},
		func(ctx context.Context, request SystemPowerProfileRequestData) error {
			return system.SetPowerProfile(ctx, request.Profile)
		})
	registerAction(router, dataStore, types.ModuleSystem, systemTimeout, event.EventSystemSetKeepAwake, event.ResponseTypeSystemKeepAwakeSet, "Keep awake set",
		func(request SystemKeepAwakeRequestData) string {
			if request.Enabled == nil {
				return "Provide enabled"
			}
			if request.Duration != nil && *request.Duration < 0 {
				return "The duration can't be negative"
			}
			return ""
		},
		func(ctx context.Context, request SystemKeepAwakeRequestData) error {
			var duration time.Duration
			if request.Duration != nil {
				duration = time.Duration(*request.Duration) * time.Second
			}
			return system.SetKeepAwake(ctx, *request.Enabled, duration)
		})
}
