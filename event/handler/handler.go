package event_handler

import (
	"github.com/timmo001/system-bridge/event"
)

func RegisterHandlers(router *event.MessageRouter) {
	RegisterExitApplicationHandler(router)
	RegisterGetDataHandler(router)
	RegisterGetDirectoriesHandler(router)
	RegisterGetFilesHandler(router)
	RegisterGetFileHandler(router)
	RegisterGetDirectoryHandler(router)
	RegisterGetSettingsHandler(router)
	RegisterKeyboardKeypressHandler(router)
	RegisterKeyboardTextHandler(router)
	RegisterMediaControlHandler(router)
	RegisterNotificationHandler(router)
	RegisterOpenHandler(router)
	RegisterPowerHibernateHandler(router)
	RegisterPowerLockHandler(router)
	RegisterPowerLogoutHandler(router)
	RegisterPowerRestartHandler(router)
	RegisterPowerShutdownHandler(router)
	RegisterPowerSleepHandler(router)
	RegisterRegisterDataListenerHandler(router)
	RegisterUnregisterDataListenerHandler(router)
	RegisterUpdateSettingsHandler(router)
	RegisterValidateDirectoryHandler(router)
}
