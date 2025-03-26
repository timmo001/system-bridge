package event_handler

import (
	"github.com/timmo001/system-bridge/types"
)

type MessageHandler struct {
	router types.MessageRouter
}

func NewMessageHandler(s types.Server) *MessageHandler {
	return &MessageHandler{router: s.GetEventMessageRouter()}
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
