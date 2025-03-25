package event

// EventType represents the type of event being handled
type EventType string

const (
	EventExitApplication        EventType = "EXIT_APPLICATION"
	EventGetData                EventType = "GET_DATA"
	EventGetDirectories         EventType = "GET_DIRECTORIES"
	EventGetFile                EventType = "GET_FILE"
	EventGetFiles               EventType = "GET_FILES"
	EventGetSettings            EventType = "GET_SETTINGS"
	EventKeyboardKeypress       EventType = "KEYBOARD_KEYPRESS"
	EventKeyboardText           EventType = "KEYBOARD_TEXT"
	EventKeyboardTextSent       EventType = "KEYBOARD_TEXT_SENT"
	EventMediaControl           EventType = "MEDIA_CONTROL"
	EventNotification           EventType = "NOTIFICATION"
	EventNotificationSent       EventType = "NOTIFICATION_SENT"
	EventOpen                   EventType = "OPEN"
	EventPowerHibernate         EventType = "POWER_HIBERNATE"
	EventPowerLock              EventType = "POWER_LOCK"
	EventPowerLogout            EventType = "POWER_LOGOUT"
	EventPowerRestart           EventType = "POWER_RESTART"
	EventPowerShutdown          EventType = "POWER_SHUTDOWN"
	EventPowerSleep             EventType = "POWER_SLEEP"
	EventRegisterDataListener   EventType = "REGISTER_DATA_LISTENER"
	EventUnregisterDataListener EventType = "UNREGISTER_DATA_LISTENER"
	EventUpdateSettings         EventType = "UPDATE_SETTINGS"
)
