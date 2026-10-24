package event_handler

import (
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
)

func RegisterHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	RegisterAudioControlHandler(router, dataStore)
	RegisterCommandExecuteHandler(router)
	RegisterDiscordControlHandler(router)
	RegisterDisplayControlHandler(router, dataStore)
	RegisterExitApplicationHandler(router)
	RegisterGetDataHandler(router)
	RegisterGetDirectoriesHandler(router)
	RegisterGetDirectoryHandler(router)
	RegisterGetDiscordSetupHandler(router)
	RegisterGetDiskMountsHandler(router)
	RegisterGetFileHandler(router)
	RegisterGetFilesHandler(router)
	RegisterGetHistoryHandler(router, dataStore)
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
	RegisterRegisterDataListenerHandler(router)
	RegisterUnregisterDataListenerHandler(router)
	RegisterUpdateDiscordSetupHandler(router)
	RegisterUpdateSettingsHandler(router, dataStore)
	RegisterValidateDirectoryHandler(router)
}
