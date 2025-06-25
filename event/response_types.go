package event

// ResponseType represents the type of response being sent
type ResponseType string

const (
	ResponseTypeError                    ResponseType = "ERROR"
	ResponseTypeApplicationExiting       ResponseType = "APPLICATION_EXITING"
	ResponseTypeCommandExecuted          ResponseType = "COMMAND_EXECUTED"
	ResponseTypeDataGet                  ResponseType = "DATA_GET"
	ResponseTypeDirectories              ResponseType = "DIRECTORIES"
	ResponseTypeDirectory                ResponseType = "DIRECTORY"
	ResponseTypeFiles                    ResponseType = "FILES"
	ResponseTypeFile                     ResponseType = "FILE"
	ResponseTypeKeyboardKeyPressed       ResponseType = "KEYBOARD_KEY_PRESSED"
	ResponseTypeKeyboardTextSent         ResponseType = "KEYBOARD_TEXT_SENT"
	ResponseTypeMediaControlled          ResponseType = "MEDIA_CONTROLLED"
	ResponseTypeNotificationSent         ResponseType = "NOTIFICATION_SENT"
	ResponseTypeOpened                   ResponseType = "OPENED"
	ResponseTypePowerHibernating         ResponseType = "POWER_HIBERNATING"
	ResponseTypePowerLocking             ResponseType = "POWER_LOCKING"
	ResponseTypePowerLoggingout          ResponseType = "POWER_LOGGINGOUT"
	ResponseTypePowerRestarting          ResponseType = "POWER_RESTARTING"
	ResponseTypePowerShuttingdown        ResponseType = "POWER_SHUTTINGDOWN"
	ResponseTypePowerSleeping            ResponseType = "POWER_SLEEPING"
	ResponseTypeDataListenerRegistered   ResponseType = "DATA_LISTENER_REGISTERED"
	ResponseTypeDataListenerUnregistered ResponseType = "DATA_LISTENER_UNREGISTERED"
	ResponseTypeDataUpdate               ResponseType = "DATA_UPDATE"
	ResponseTypeSettingsResult           ResponseType = "SETTINGS_RESULT"
	ResponseTypeSettingsUpdated          ResponseType = "SETTINGS_UPDATED"
)

type ResponseSubtype string

const (
	ResponseSubtypeNone                      ResponseSubtype = "NONE"
	ResponseSubtypeBadRequest                ResponseSubtype = "BAD_REQUEST"
	ResponseSubtypeBadToken                  ResponseSubtype = "BAD_TOKEN"
	ResponseSubtypeBadJSON                   ResponseSubtype = "BAD_JSON"
	ResponseSubtypeBadDirectory              ResponseSubtype = "BAD_DIRECTORY"
	ResponseSubtypeBadFile                   ResponseSubtype = "BAD_FILE"
	ResponseSubtypeBadPath                   ResponseSubtype = "BAD_PATH"
	ResponseSubtypeCommandNotAllowed         ResponseSubtype = "COMMAND_NOT_ALLOWED"
	ResponseSubtypeCommandNotFound           ResponseSubtype = "COMMAND_NOT_FOUND"
	ResponseSubtypeInvalidAction             ResponseSubtype = "INVALID_ACTION"
	ResponseSubtypeListenerAlreadyRegistered ResponseSubtype = "LISTENER_ALREADY_REGISTERED"
	ResponseSubtypeListenerNotRegistered     ResponseSubtype = "LISTENER_NOT_REGISTERED"
	ResponseSubtypeMissingAction             ResponseSubtype = "MISSING_ACTION"
	ResponseSubtypeMissingBase               ResponseSubtype = "MISSING_BASE"
	ResponseSubtypeMissingCommand            ResponseSubtype = "MISSING_COMMAND"
	ResponseSubtypeMissingKey                ResponseSubtype = "MISSING_KEY"
	ResponseSubtypeMissingModules            ResponseSubtype = "MISSING_MODULES"
	ResponseSubtypeMissingPath               ResponseSubtype = "MISSING_PATH"
	ResponseSubtypeMissingPathURL            ResponseSubtype = "MISSING_PATH_URL"
	ResponseSubtypeMissingSetting            ResponseSubtype = "MISSING_SETTING"
	ResponseSubtypeMissingText               ResponseSubtype = "MISSING_TEXT"
	ResponseSubtypeMissingTitle              ResponseSubtype = "MISSING_TITLE"
	ResponseSubtypeMissingToken              ResponseSubtype = "MISSING_TOKEN"
	ResponseSubtypeMissingValue              ResponseSubtype = "MISSING_VALUE"
	ResponseSubtypeUnknownEvent              ResponseSubtype = "UNKNOWN_EVENT"
)
