"""Constants."""

from enum import StrEnum

from .models.keyboard_key import KeyboardKey
from .models.keyboard_text import KeyboardText
from .models.media_directories import MediaDirectory
from .models.media_files import MediaFile, MediaFiles
from .models.modules import Module, ModulesData
from .models.modules.battery import Battery
from .models.modules.cpu import CPU
from .models.modules.disks import Disks
from .models.modules.displays import Display
from .models.modules.gpus import GPU
from .models.modules.media import Media
from .models.modules.memory import Memory
from .models.modules.networks import Networks
from .models.modules.processes import Process
from .models.modules.sensors import Sensors
from .models.modules.system import System
from .models.notification import Notification
from .models.open_path import OpenPath
from .models.open_url import OpenUrl
from .models.response import Response


class QueryParameter(StrEnum):
    """Query Parameter."""

    ALBUM = "album"
    API_PORT = "apiPort"
    ARTIST = "artist"
    AUTOPLAY = "autoplay"
    BASE = "base"
    FILENAME = "filename"
    PATH = "path"
    TITLE = "title"
    TOKEN = "token"
    URL = "url"
    VOLUME = "volume"


class EventKey(StrEnum):
    """Event Key."""

    APP_ICON = "app_icon"
    APP_NAME = "app_name"
    BASE = "base"
    DATA = "data"
    DIRECTORIES = "directories"
    EVENT = "event"
    FILE = "file"
    FILENAME = "filename"
    FILES = "files"
    ID = "id"
    KEY = "key"
    MESSAGE = "message"
    MODULE = "module"
    MODULES = "modules"
    PATH = "path"
    SETTING = "setting"
    SUBTYPE = "subtype"
    TEXT = "text"
    TIMEOUT = "timeout"
    TITLE = "title"
    TOKEN = "token"
    TYPE = "type"
    URL = "url"
    VALUE = "value"
    VERSION = "version"
    VERSIONS = "versions"


class EventType(StrEnum):
    """Event Type."""

    APPLICATION_UPDATE = "APPLICATION_UPDATE"
    APPLICATION_UPDATING = "APPLICATION_UPDATING"
    COMMAND_COMPLETED = "COMMAND_COMPLETED"
    COMMAND_EXECUTE = "COMMAND_EXECUTE"
    COMMAND_EXECUTING = "COMMAND_EXECUTING"
    DATA_GET = "DATA_GET"
    DATA_LISTENER_REGISTERED = "DATA_LISTENER_REGISTERED"
    DATA_LISTENER_UNREGISTERED = "DATA_LISTENER_UNREGISTERED"
    DATA_UPDATE = "DATA_UPDATE"
    DIRECTORIES = "DIRECTORIES"
    ERROR = "ERROR"
    EXIT_APPLICATION = "EXIT_APPLICATION"
    FILE = "FILE"
    FILES = "FILES"
    GET_DATA = "GET_DATA"
    GET_DIRECTORIES = "GET_DIRECTORIES"
    GET_FILE = "GET_FILE"
    GET_FILES = "GET_FILES"
    GET_SETTINGS = "GET_SETTINGS"
    KEYBOARD_KEY_PRESSED = "KEYBOARD_KEY_PRESSED"
    KEYBOARD_KEYPRESS = "KEYBOARD_KEYPRESS"
    KEYBOARD_TEXT = "KEYBOARD_TEXT"
    KEYBOARD_TEXT_SENT = "KEYBOARD_TEXT_SENT"
    MEDIA_CONTROL = "MEDIA_CONTROL"
    NOTIFICATION = "NOTIFICATION"
    NOTIFICATION_SENT = "NOTIFICATION_SENT"
    OPEN = "OPEN"
    OPENED = "OPENED"
    POWER_HIBERNATE = "POWER_HIBERNATE"
    POWER_HIBERNATING = "POWER_HIBERNATING"
    POWER_LOCK = "POWER_LOCK"
    POWER_LOCKING = "POWER_LOCKING"
    POWER_LOGGINGOUT = "POWER_LOGGINGOUT"
    POWER_LOGOUT = "POWER_LOGOUT"
    POWER_RESTART = "POWER_RESTART"
    POWER_RESTARTING = "POWER_RESTARTING"
    POWER_SHUTDOWN = "POWER_SHUTDOWN"
    POWER_SHUTTINGDOWN = "POWER_SHUTTINGDOWN"
    POWER_SLEEP = "POWER_SLEEP"
    POWER_SLEEPING = "POWER_SLEEPING"
    REGISTER_DATA_LISTENER = "REGISTER_DATA_LISTENER"
    SETTINGS_UPDATED = "SETTINGS_UPDATED"
    SETTINGS_RESULT = "SETTINGS_RESULT"
    UNREGISTER_DATA_LISTENER = "UNREGISTER_DATA_LISTENER"
    UPDATE_SETTINGS = "UPDATE_SETTINGS"


class EventSubType(StrEnum):
    """Event SubType."""

    BAD_TOKEN = "BAD_TOKEN"
    BAD_DIRECTORY = "BAD_DIRECTORY"
    BAD_FILE = "BAD_FILE"
    BAD_JSON = "BAD_JSON"
    BAD_KEY = "MISSING_KEY"
    BAD_PATH = "BAD_PATH"
    BAD_REQUEST = "BAD_REQUEST"
    COMMAND_NOT_FOUND = "COMMAND_NOT_FOUND"
    INVALID_ACTION = "INVALID_ACTION"
    LISTENER_ALREADY_REGISTERED = "LISTENER_ALREADY_REGISTERED"
    LISTENER_NOT_REGISTERED = "LISTENER_NOT_REGISTERED"
    MISSING_ACTION = "MISSING_ACTION"
    MISSING_TOKEN = "MISSING_TOKEN"
    MISSING_BASE = "MISSING_BASE"
    MISSING_KEY = "MISSING_KEY"
    MISSING_MODULES = "MISSING_MODULES"
    MISSING_PATH = "MISSING_PATH"
    MISSING_PATH_URL = "MISSING_PATH_URL"
    MISSING_SETTING = "MISSING_SETTING"
    MISSING_TEXT = "MISSING_TEXT"
    MISSING_TITLE = "MISSING_TITLE"
    MISSING_VALUE = "MISSING_VALUE"
    UNKNOWN_EVENT = "UNKNOWN_EVENT"


class Model(StrEnum):
    """Model Enums."""

    BATTERY = Module.BATTERY
    CPU = Module.CPU
    DATA = "data"
    DISKS = Module.DISKS
    DISPLAYS = Module.DISPLAYS
    GPUS = Module.GPUS
    KEYBOARD_KEY = "keyboard_key"
    KEYBOARD_TEXT = "keyboard_text"
    MEDIA = Module.MEDIA
    MEDIA_DIRECTORIES = "media_directories"
    MEDIA_FILE = "media_file"
    MEDIA_FILES = "media_files"
    MEMORY = Module.MEMORY
    NETWORKS = Module.NETWORKS
    NOTIFICATION = "notification"
    OPEN_PATH = "open_path"
    OPEN_URL = "open_url"
    PROCESSES = Module.PROCESSES
    RESPONSE = "response"
    SECRETS = "secrets"
    SENSORS = Module.SENSORS
    SETTINGS = "settings"
    SYSTEM = Module.SYSTEM


MODEL_MAP = {
    Model.BATTERY: Battery,
    Model.CPU: CPU,
    Model.DATA: ModulesData,
    Model.DISKS: Disks,
    Model.DISPLAYS: Display,  # Map to Display not list[Display] so it can be mapped
    Model.GPUS: GPU,  # Map to GPU not list[GPU] so it can be mapped
    Model.KEYBOARD_KEY: KeyboardKey,
    Model.KEYBOARD_TEXT: KeyboardText,
    Model.MEDIA_DIRECTORIES: MediaDirectory,  # Map to MediaDirectory not list[MediaDirectory] so it can be mapped
    Model.MEDIA_FILE: MediaFile,
    Model.MEDIA_FILES: MediaFiles,
    Model.MEDIA: Media,
    Model.MEMORY: Memory,
    Model.NETWORKS: Networks,
    Model.NOTIFICATION: Notification,
    Model.OPEN_PATH: OpenPath,
    Model.OPEN_URL: OpenUrl,
    Model.PROCESSES: Process,  # Map to Process not list[Process] so it can be mapped
    Model.RESPONSE: Response,
    Model.SENSORS: Sensors,
    Model.SYSTEM: System,
}
