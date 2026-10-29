package event_handler

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/handlers/command/prefab"
)

const clipboardTimeout = 10 * time.Second

type ClipboardTextRequestData struct {
	Text string `json:"text" mapstructure:"text"`
}

func RegisterClipboardHandlers(router *event.MessageRouter) {
	registerQuery(router, clipboardTimeout, event.EventClipboardGetText, event.ResponseTypeClipboardText, "Got clipboard",
		func(struct{}) string { return "" },
		func(ctx context.Context, _ struct{}) (*types.ClipboardText, error) {
			text, err := prefab.GetClipboard(ctx)
			if err != nil {
				return nil, err
			}
			return &types.ClipboardText{Text: text}, nil
		})
	// No module shows the clipboard, so there's nothing to update after
	registerAction(router, nil, "", clipboardTimeout, event.EventClipboardSetText, event.ResponseTypeClipboardTextSet, "Clipboard set",
		func(request ClipboardTextRequestData) string {
			return required(request.Text, "No text provided")
		},
		func(ctx context.Context, request ClipboardTextRequestData) error {
			return prefab.SetClipboard(ctx, request.Text)
		})
}
