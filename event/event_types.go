package event

// EventType represents the type of event being handled
type EventType string

const (
	EventExitApplication        EventType = "EXIT_APPLICATION"
	EventGetData                EventType = "GET_DATA"
	EventGetDirectories         EventType = "GET_DIRECTORIES"
	EventGetDirectory           EventType = "GET_DIRECTORY"
	EventGetFiles               EventType = "GET_FILES"
	EventGetFile                EventType = "GET_FILE"
	EventGetSettings            EventType = "GET_SETTINGS"
	EventKeyboardKeypress       EventType = "KEYBOARD_KEYPRESS"
	EventKeyboardText           EventType = "KEYBOARD_TEXT"
	EventMediaControl           EventType = "MEDIA_CONTROL"
	EventNotification           EventType = "NOTIFICATION"
	EventOpen                   EventType = "OPEN"
	EventPowerHibernate         EventType = "POWER_HIBERNATE"
	EventPowerLock              EventType = "POWER_LOCK"
	EventPowerLogout            EventType = "POWER_LOGOUT"
	EventPowerRestart           EventType = "POWER_RESTART"
	EventPowerShutdown          EventType = "POWER_SHUTDOWN"
	EventPowerSleep             EventType = "POWER_SLEEP"
	EventRegisterDataListener   EventType = "REGISTER_DATA_LISTENER"
	EventRunCommand             EventType = "RUN_COMMAND"
	EventUnregisterDataListener EventType = "UNREGISTER_DATA_LISTENER"
	EventDataUpdate             EventType = "DATA_UPDATE"
	EventUpdateSettings         EventType = "UPDATE_SETTINGS"
)
