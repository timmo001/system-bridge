package event_handler

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/command/prefab"
)

const clipboardTimeout = 10 * time.Second

type ClipboardTextRequestData struct {
	Text string `json:"text" mapstructure:"text"`
}

func RegisterClipboardHandlers(router *event.MessageRouter) {
	// No module shows the clipboard, so there's nothing to update after
	registerAction(router, nil, "", clipboardTimeout, event.EventClipboardSetText, event.ResponseTypeClipboardTextSet, "Clipboard set",
		func(request ClipboardTextRequestData) string {
			return required(request.Text, "No text provided")
		},
		func(ctx context.Context, request ClipboardTextRequestData) error {
			return prefab.SetClipboard(ctx, request.Text)
		})
}
