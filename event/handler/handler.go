package event_handler

import (
	"github.com/timmo001/system-bridge/backend/service"
	"github.com/timmo001/system-bridge/event"
)

func RegisterHandlers(router *event.MessageRouter, backendService *service.Service) {
	RegisterExitApplicationHandler(router)
	RegisterGetDataHandler(router)
	RegisterGetDirectoriesHandler(router)
	RegisterGetFilesHandler(router)
	RegisterGetFileHandler(router)
	RegisterGetDirectoryHandler(router)
	RegisterGetSettingsHandler(router)
	RegisterKeyboardKeypressHandler(router)
	RegisterKeyboardTextHandler(router)
	RegisterMediaControlHandler(router, backendService)
	RegisterNotificationHandler(router)
	RegisterOpenHandler(router)
	RegisterPowerHibernateHandler(router)
	RegisterPowerLockHandler(router)
	RegisterPowerLogoutHandler(router)
	RegisterPowerRestartHandler(router)
	RegisterPowerShutdownHandler(router)
	RegisterPowerSleepHandler(router)
	RegisterRegisterDataListenerHandler(router, backendService)
	RegisterUnregisterDataListenerHandler(router, backendService)
	RegisterCommandExecuteHandler(router)
	RegisterUpdateSettingsHandler(router)
	RegisterValidateDirectoryHandler(router)
}
