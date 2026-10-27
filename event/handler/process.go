package event_handler

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/processes"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type ProcessKillRequestData struct {
	ID    int  `json:"id" mapstructure:"id"`
	Force bool `json:"force" mapstructure:"force"`
}

func RegisterProcessHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	registerAction(router, dataStore, types.ModuleProcesses, 10*time.Second, event.EventProcessKill, event.ResponseTypeProcessKilled, "Process killed",
		func(request ProcessKillRequestData) string {
			if request.ID <= 0 {
				return "No process id provided"
			}
			return ""
		},
		func(ctx context.Context, request ProcessKillRequestData) error {
			return processes.Kill(ctx, request.ID, request.Force)
		})
}
