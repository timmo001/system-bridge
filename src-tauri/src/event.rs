use std::fmt;
use std::str::FromStr;
use serde::{Deserialize, Serialize};

// Event Types
pub const TYPE_APPLICATION_UPDATE: &str = "APPLICATION_UPDATE";
pub const TYPE_APPLICATION_UPDATING: &str = "APPLICATION_UPDATING";
pub const TYPE_DATA_GET: &str = "DATA_GET";
pub const TYPE_DATA_LISTENER_REGISTERED: &str = "DATA_LISTENER_REGISTERED";
pub const TYPE_DATA_LISTENER_UNREGISTERED: &str = "DATA_LISTENER_UNREGISTERED";
pub const TYPE_DATA_UPDATE: &str = "DATA_UPDATE";
pub const TYPE_DIRECTORIES: &str = "DIRECTORIES";
pub const TYPE_ERROR: &str = "ERROR";
pub const TYPE_EXIT_APPLICATION: &str = "EXIT_APPLICATION";
pub const TYPE_FILE: &str = "FILE";
pub const TYPE_FILES: &str = "FILES";
pub const TYPE_GET_DATA: &str = "GET_DATA";
pub const TYPE_GET_DIRECTORIES: &str = "GET_DIRECTORIES";
pub const TYPE_GET_FILE: &str = "GET_FILE";
pub const TYPE_GET_FILES: &str = "GET_FILES";
pub const TYPE_GET_SETTINGS: &str = "GET_SETTINGS";
pub const TYPE_KEYBOARD_KEY_PRESSED: &str = "KEYBOARD_KEY_PRESSED";
pub const TYPE_KEYBOARD_KEYPRESS: &str = "KEYBOARD_KEYPRESS";
pub const TYPE_KEYBOARD_TEXT: &str = "KEYBOARD_TEXT";
pub const TYPE_KEYBOARD_TEXT_SENT: &str = "KEYBOARD_TEXT_SENT";
pub const TYPE_MEDIA_CONTROL: &str = "MEDIA_CONTROL";
pub const TYPE_NOTIFICATION: &str = "NOTIFICATION";
pub const TYPE_NOTIFICATION_SENT: &str = "NOTIFICATION_SENT";
pub const TYPE_OPEN: &str = "OPEN";
pub const TYPE_OPENED: &str = "OPENED";
pub const TYPE_POWER_HIBERNATE: &str = "POWER_HIBERNATE";
pub const TYPE_POWER_HIBERNATING: &str = "POWER_HIBERNATING";
pub const TYPE_POWER_LOCK: &str = "POWER_LOCK";
pub const TYPE_POWER_LOCKING: &str = "POWER_LOCKING";
pub const TYPE_POWER_LOGGINGOUT: &str = "POWER_LOGGINGOUT";
pub const TYPE_POWER_LOGOUT: &str = "POWER_LOGOUT";
pub const TYPE_POWER_RESTART: &str = "POWER_RESTART";
pub const TYPE_POWER_RESTARTING: &str = "POWER_RESTARTING";
pub const TYPE_POWER_SHUTDOWN: &str = "POWER_SHUTDOWN";
pub const TYPE_POWER_SHUTTINGDOWN: &str = "POWER_SHUTTINGDOWN";
pub const TYPE_POWER_SLEEP: &str = "POWER_SLEEP";
pub const TYPE_POWER_SLEEPING: &str = "POWER_SLEEPING";
pub const TYPE_REGISTER_DATA_LISTENER: &str = "REGISTER_DATA_LISTENER";
pub const TYPE_SETTINGS_UPDATED: &str = "SETTINGS_UPDATED";
pub const TYPE_SETTINGS_RESULT: &str = "SETTINGS_RESULT";
pub const TYPE_UNREGISTER_DATA_LISTENER: &str = "UNREGISTER_DATA_LISTENER";
pub const TYPE_UPDATE_SETTINGS: &str = "UPDATE_SETTINGS";
pub const TYPE_UNKNOWN: &str = "UNKNOWN";

#[derive(Debug, Serialize, Deserialize)]
pub enum EventType {
    ApplicationUpdate,
    ApplicationUpdating,
    DataGet,
    DataListenerRegistered,
    DataListenerUnregistered,
    DataUpdate,
    Directories,
    Error,
    ExitApplication,
    File,
    Files,
    GetData,
    GetDirectories,
    GetFile,
    GetFiles,
    GetSettings,
    KeyboardKeyPressed,
    KeyboardKeypress,
    KeyboardText,
    KeyboardTextSent,
    MediaControl,
    Notification,
    NotificationSent,
    Open,
    Opened,
    PowerHibernate,
    PowerHibernating,
    PowerLock,
    PowerLocking,
    PowerLoggingOut,
    PowerLogout,
    PowerRestart,
    PowerRestarting,
    PowerShutdown,
    PowerShuttingDown,
    PowerSleep,
    PowerSleeping,
    RegisterDataListener,
    SettingsUpdated,
    SettingsResult,
    UnregisterDataListener,
    UpdateSettings,
    Unknown,
}

impl FromStr for EventType {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            TYPE_APPLICATION_UPDATE => Ok(EventType::ApplicationUpdate),
            TYPE_APPLICATION_UPDATING => Ok(EventType::ApplicationUpdating),
            TYPE_DATA_GET => Ok(EventType::DataGet),
            TYPE_DATA_LISTENER_REGISTERED => Ok(EventType::DataListenerRegistered),
            TYPE_DATA_LISTENER_UNREGISTERED => Ok(EventType::DataListenerUnregistered),
            TYPE_DATA_UPDATE => Ok(EventType::DataUpdate),
            TYPE_DIRECTORIES => Ok(EventType::Directories),
            TYPE_ERROR => Ok(EventType::Error),
            TYPE_EXIT_APPLICATION => Ok(EventType::ExitApplication),
            TYPE_FILE => Ok(EventType::File),
            TYPE_FILES => Ok(EventType::Files),
            TYPE_GET_DATA => Ok(EventType::GetData),
            TYPE_GET_DIRECTORIES => Ok(EventType::GetDirectories),
            TYPE_GET_FILE => Ok(EventType::GetFile),
            TYPE_GET_FILES => Ok(EventType::GetFiles),
            TYPE_GET_SETTINGS => Ok(EventType::GetSettings),
            TYPE_KEYBOARD_KEY_PRESSED => Ok(EventType::KeyboardKeyPressed),
            TYPE_KEYBOARD_KEYPRESS => Ok(EventType::KeyboardKeypress),
            TYPE_KEYBOARD_TEXT => Ok(EventType::KeyboardText),
            TYPE_KEYBOARD_TEXT_SENT => Ok(EventType::KeyboardTextSent),
            TYPE_MEDIA_CONTROL => Ok(EventType::MediaControl),
            TYPE_NOTIFICATION => Ok(EventType::Notification),
            TYPE_NOTIFICATION_SENT => Ok(EventType::NotificationSent),
            TYPE_OPEN => Ok(EventType::Open),
            TYPE_OPENED => Ok(EventType::Opened),
            TYPE_POWER_HIBERNATE => Ok(EventType::PowerHibernate),
            TYPE_POWER_HIBERNATING => Ok(EventType::PowerHibernating),
            TYPE_POWER_LOCK => Ok(EventType::PowerLock),
            TYPE_POWER_LOCKING => Ok(EventType::PowerLocking),
            TYPE_POWER_LOGGINGOUT => Ok(EventType::PowerLoggingOut),
            TYPE_POWER_LOGOUT => Ok(EventType::PowerLogout),
            TYPE_POWER_RESTART => Ok(EventType::PowerRestart),
            TYPE_POWER_RESTARTING => Ok(EventType::PowerRestarting),
            TYPE_POWER_SHUTDOWN => Ok(EventType::PowerShutdown),
            TYPE_POWER_SHUTTINGDOWN => Ok(EventType::PowerShuttingDown),
            TYPE_POWER_SLEEP => Ok(EventType::PowerSleep),
            TYPE_POWER_SLEEPING => Ok(EventType::PowerSleeping),
            TYPE_REGISTER_DATA_LISTENER => Ok(EventType::RegisterDataListener),
            TYPE_SETTINGS_UPDATED => Ok(EventType::SettingsUpdated),
            TYPE_SETTINGS_RESULT => Ok(EventType::SettingsResult),
            TYPE_UNREGISTER_DATA_LISTENER => Ok(EventType::UnregisterDataListener),
            TYPE_UPDATE_SETTINGS => Ok(EventType::UpdateSettings),
            TYPE_UNKNOWN => Ok(EventType::Unknown),
            _ => Ok(EventType::Unknown),
        }
    }
}

impl fmt::Display for EventType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                EventType::ApplicationUpdate => TYPE_APPLICATION_UPDATE,
                EventType::ApplicationUpdating => TYPE_APPLICATION_UPDATING,
                EventType::DataGet => TYPE_DATA_GET,
                EventType::DataListenerRegistered => TYPE_DATA_LISTENER_REGISTERED,
                EventType::DataListenerUnregistered => TYPE_DATA_LISTENER_UNREGISTERED,
                EventType::DataUpdate => TYPE_DATA_UPDATE,
                EventType::Directories => TYPE_DIRECTORIES,
                EventType::Error => TYPE_ERROR,
                EventType::ExitApplication => TYPE_EXIT_APPLICATION,
                EventType::File => TYPE_FILE,
                EventType::Files => TYPE_FILES,
                EventType::GetData => TYPE_GET_DATA,
                EventType::GetDirectories => TYPE_GET_DIRECTORIES,
                EventType::GetFile => TYPE_GET_FILE,
                EventType::GetFiles => TYPE_GET_FILES,
                EventType::GetSettings => TYPE_GET_SETTINGS,
                EventType::KeyboardKeyPressed => TYPE_KEYBOARD_KEY_PRESSED,
                EventType::KeyboardKeypress => TYPE_KEYBOARD_KEYPRESS,
                EventType::KeyboardText => TYPE_KEYBOARD_TEXT,
                EventType::KeyboardTextSent => TYPE_KEYBOARD_TEXT_SENT,
                EventType::MediaControl => TYPE_MEDIA_CONTROL,
                EventType::Notification => TYPE_NOTIFICATION,
                EventType::NotificationSent => TYPE_NOTIFICATION_SENT,
                EventType::Open => TYPE_OPEN,
                EventType::Opened => TYPE_OPENED,
                EventType::PowerHibernate => TYPE_POWER_HIBERNATE,
                EventType::PowerHibernating => TYPE_POWER_HIBERNATING,
                EventType::PowerLock => TYPE_POWER_LOCK,
                EventType::PowerLocking => TYPE_POWER_LOCKING,
                EventType::PowerLoggingOut => TYPE_POWER_LOGGINGOUT,
                EventType::PowerLogout => TYPE_POWER_LOGOUT,
                EventType::PowerRestart => TYPE_POWER_RESTART,
                EventType::PowerRestarting => TYPE_POWER_RESTARTING,
                EventType::PowerShutdown => TYPE_POWER_SHUTDOWN,
                EventType::PowerShuttingDown => TYPE_POWER_SHUTTINGDOWN,
                EventType::PowerSleep => TYPE_POWER_SLEEP,
                EventType::PowerSleeping => TYPE_POWER_SLEEPING,
                EventType::RegisterDataListener => TYPE_REGISTER_DATA_LISTENER,
                EventType::SettingsUpdated => TYPE_SETTINGS_UPDATED,
                EventType::SettingsResult => TYPE_SETTINGS_RESULT,
                EventType::UnregisterDataListener => TYPE_UNREGISTER_DATA_LISTENER,
                EventType::UpdateSettings => TYPE_UPDATE_SETTINGS,
                EventType::Unknown => TYPE_UNKNOWN,
            }
        )
    }
}

// Event Subtypes
pub const SUBTYPE_BAD_DIRECTORY: &str = "BAD_DIRECTORY";
pub const SUBTYPE_BAD_FILE: &str = "BAD_FILE";
pub const SUBTYPE_BAD_JSON: &str = "BAD_JSON";
pub const SUBTYPE_BAD_KEY: &str = "MISSING_KEY";
pub const SUBTYPE_BAD_PATH: &str = "BAD_PATH";
pub const SUBTYPE_BAD_REQUEST: &str = "BAD_REQUEST";
pub const SUBTYPE_BAD_TOKEN: &str = "BAD_TOKEN";
pub const SUBTYPE_INVALID_ACTION: &str = "INVALID_ACTION";
pub const SUBTYPE_LISTENER_ALREADY_REGISTERED: &str = "LISTENER_ALREADY_REGISTERED";
pub const SUBTYPE_LISTENER_NOT_REGISTERED: &str = "LISTENER_NOT_REGISTERED";
pub const SUBTYPE_MISSING_ACTION: &str = "MISSING_ACTION";
pub const SUBTYPE_MISSING_BASE: &str = "MISSING_BASE";
pub const SUBTYPE_MISSING_KEY: &str = "MISSING_KEY";
pub const SUBTYPE_MISSING_MODULES: &str = "MISSING_MODULES";
pub const SUBTYPE_MISSING_PATH: &str = "MISSING_PATH";
pub const SUBTYPE_MISSING_PATH_URL: &str = "MISSING_PATH_URL";
pub const SUBTYPE_MISSING_SETTING: &str = "MISSING_SETTING";
pub const SUBTYPE_MISSING_TEXT: &str = "MISSING_TEXT";
pub const SUBTYPE_MISSING_TITLE: &str = "MISSING_TITLE";
pub const SUBTYPE_MISSING_TOKEN: &str = "MISSING_TOKEN";
pub const SUBTYPE_MISSING_VALUE: &str = "MISSING_VALUE";
pub const SUBTYPE_UNKNOWN_EVENT: &str = "UNKNOWN_EVENT";

#[derive(Debug, Serialize, Deserialize)]
pub enum EventSubtype {
    BadDirectory,
    BadFile,
    BadJson,
    BadKey,
    BadPath,
    BadRequest,
    BadToken,
    InvalidAction,
    ListenerAlreadyRegistered,
    ListenerNotRegistered,
    MissingAction,
    MissingBase,
    MissingKey,
    MissingModules,
    MissingPath,
    MissingPathUrl,
    MissingSetting,
    MissingText,
    MissingTitle,
    MissingToken,
    MissingValue,
    UnknownEvent,
}

impl FromStr for EventSubtype {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            SUBTYPE_BAD_DIRECTORY => Ok(EventSubtype::BadDirectory),
            SUBTYPE_BAD_FILE => Ok(EventSubtype::BadFile),
            SUBTYPE_BAD_JSON => Ok(EventSubtype::BadJson),
            SUBTYPE_BAD_KEY => Ok(EventSubtype::BadKey),
            SUBTYPE_BAD_PATH => Ok(EventSubtype::BadPath),
            SUBTYPE_BAD_REQUEST => Ok(EventSubtype::BadRequest),
            SUBTYPE_BAD_TOKEN => Ok(EventSubtype::BadToken),
            SUBTYPE_INVALID_ACTION => Ok(EventSubtype::InvalidAction),
            SUBTYPE_LISTENER_ALREADY_REGISTERED => Ok(EventSubtype::ListenerAlreadyRegistered),
            SUBTYPE_LISTENER_NOT_REGISTERED => Ok(EventSubtype::ListenerNotRegistered),
            SUBTYPE_MISSING_ACTION => Ok(EventSubtype::MissingAction),
            SUBTYPE_MISSING_BASE => Ok(EventSubtype::MissingBase),
            // SUBTYPE_MISSING_KEY => Ok(EventSubtype::MissingKey),
            SUBTYPE_MISSING_MODULES => Ok(EventSubtype::MissingModules),
            SUBTYPE_MISSING_PATH => Ok(EventSubtype::MissingPath),
            SUBTYPE_MISSING_PATH_URL => Ok(EventSubtype::MissingPathUrl),
            SUBTYPE_MISSING_SETTING => Ok(EventSubtype::MissingSetting),
            SUBTYPE_MISSING_TEXT => Ok(EventSubtype::MissingText),
            SUBTYPE_MISSING_TITLE => Ok(EventSubtype::MissingTitle),
            SUBTYPE_MISSING_TOKEN => Ok(EventSubtype::MissingToken),
            SUBTYPE_MISSING_VALUE => Ok(EventSubtype::MissingValue),
            SUBTYPE_UNKNOWN_EVENT => Ok(EventSubtype::UnknownEvent),
            _ => Ok(EventSubtype::UnknownEvent),
        }
    }
}

impl fmt::Display for EventSubtype {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                EventSubtype::BadDirectory => SUBTYPE_BAD_DIRECTORY,
                EventSubtype::BadFile => SUBTYPE_BAD_FILE,
                EventSubtype::BadJson => SUBTYPE_BAD_JSON,
                EventSubtype::BadKey => SUBTYPE_BAD_KEY,
                EventSubtype::BadPath => SUBTYPE_BAD_PATH,
                EventSubtype::BadRequest => SUBTYPE_BAD_REQUEST,
                EventSubtype::BadToken => SUBTYPE_BAD_TOKEN,
                EventSubtype::InvalidAction => SUBTYPE_INVALID_ACTION,
                EventSubtype::ListenerAlreadyRegistered => SUBTYPE_LISTENER_ALREADY_REGISTERED,
                EventSubtype::ListenerNotRegistered => SUBTYPE_LISTENER_NOT_REGISTERED,
                EventSubtype::MissingAction => SUBTYPE_MISSING_ACTION,
                EventSubtype::MissingBase => SUBTYPE_MISSING_BASE,
                EventSubtype::MissingKey => SUBTYPE_MISSING_KEY,
                EventSubtype::MissingModules => SUBTYPE_MISSING_MODULES,
                EventSubtype::MissingPath => SUBTYPE_MISSING_PATH,
                EventSubtype::MissingPathUrl => SUBTYPE_MISSING_PATH_URL,
                EventSubtype::MissingSetting => SUBTYPE_MISSING_SETTING,
                EventSubtype::MissingText => SUBTYPE_MISSING_TEXT,
                EventSubtype::MissingTitle => SUBTYPE_MISSING_TITLE,
                EventSubtype::MissingToken => SUBTYPE_MISSING_TOKEN,
                EventSubtype::MissingValue => SUBTYPE_MISSING_VALUE,
                EventSubtype::UnknownEvent => SUBTYPE_UNKNOWN_EVENT,
            }
        )
    }
}
