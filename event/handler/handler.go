package event_handler

import (
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type DataListenerRegistry interface {
	RegisterDataListener(connection string, modules []types.ModuleName)
	UnregisterDataListener(connection string)
}

func RegisterHandlers(router *event.MessageRouter, dataStore *data.DataStore, listeners DataListenerRegistry) {
	RegisterExitApplicationHandler(router)
	RegisterGetDataHandler(router)
	RegisterGetDirectoriesHandler(router)
	RegisterGetFilesHandler(router)
	RegisterGetFileHandler(router)
	RegisterGetDirectoryHandler(router)
	RegisterGetSettingsHandler(router)
	RegisterKeyboardKeypressHandler(router)
	RegisterKeyboardTextHandler(router)
	RegisterMediaControlHandler(router, dataStore)
	RegisterNotificationHandler(router)
	RegisterOpenHandler(router)
	RegisterPowerHibernateHandler(router)
	RegisterPowerLockHandler(router)
	RegisterPowerLogoutHandler(router)
	RegisterPowerRestartHandler(router)
	RegisterPowerShutdownHandler(router)
	RegisterPowerSleepHandler(router)
	RegisterRegisterDataListenerHandler(router, listeners)
	RegisterUnregisterDataListenerHandler(router, listeners)
	RegisterCommandExecuteHandler(router)
	RegisterUpdateSettingsHandler(router)
	RegisterValidateDirectoryHandler(router)
}
