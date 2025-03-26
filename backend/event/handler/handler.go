package event_handler

import (
	"github.com/timmo001/system-bridge/backend/event"
)

type MessageHandler struct {
	router *event.MessageRouter
}

func NewMessageHandler(router *event.MessageRouter) *MessageHandler {
	return &MessageHandler{router: router}
}

func (h *MessageHandler) RegisterMessageHandlers() {
	// Setup event handlers
	h.RegisterDataUpdateHandler()
	h.RegisterExitApplicationHandler()
	h.RegisterGetDataHandler()
	h.RegisterGetDirectoriesHandler()
	h.RegisterGetFilesHandler()
	h.RegisterGetFileHandler()
	h.RegisterGetDirectoryHandler()
	h.RegisterGetSettingsHandler()
	h.RegisterKeyboardKeypressHandler()
	h.RegisterKeyboardTextHandler()
	h.RegisterMediaControlHandler()
	h.RegisterNotificationHandler()
	h.RegisterOpenHandler()
	h.RegisterPowerHibernateHandler()
	h.RegisterPowerLockHandler()
	h.RegisterPowerLogoutHandler()
	h.RegisterPowerRestartHandler()
	h.RegisterPowerShutdownHandler()
	h.RegisterPowerSleepHandler()
	h.RegisterRegisterDataListenerHandler()
	h.RegisterUnregisterDataListenerHandler()
	h.RegisterUpdateSettingsHandler()
}
