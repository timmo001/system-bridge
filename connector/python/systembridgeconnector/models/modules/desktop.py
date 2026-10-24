"""Desktop."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


class DesktopCompositor(StrEnum):
    """Desktop Compositor."""

    HYPRLAND = "hyprland"
    WAYLAND = "wayland"
    WINDOWS = "windows"


class HyprlandFullscreenMode(StrEnum):
    """Hyprland Fullscreen Mode."""

    FULLSCREEN = "fullscreen"
    MAXIMISED = "maximised"
    NONE = "none"


class HyprlandScreencastType(StrEnum):
    """Hyprland Screencast Type."""

    MONITOR = "monitor"
    REGION = "region"
    WINDOW = "window"


@filter_unexpected_fields
@dataclass(slots=True)
class DesktopKeyboard:
    """Desktop Keyboard.

    layout is the xkb layout code, or the layout ID on Windows.
    """

    layout: str | None = None
    name: str | None = None
    layouts: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.layouts = self.layouts or []


@filter_unexpected_fields
@dataclass(slots=True)
class DesktopWindow:
    """Desktop Window.

    title is only reported when the desktop.windowTitles setting is on.
    """

    id: str
    focused: bool
    app: str | None = None
    title: str | None = None
    pid: int | None = None
    workspace: str | None = None
    display: str | None = None
    x: int | None = None
    y: int | None = None
    width: int | None = None
    height: int | None = None
    fullscreen: bool | None = None
    maximised: bool | None = None
    minimised: bool | None = None
    floating: bool | None = None
    urgent: bool | None = None
    inhibiting_idle: bool | None = None
    content_type: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class DesktopWorkspace:
    """Desktop Workspace."""

    id: str
    active: bool
    focused: bool
    name: str | None = None
    display: str | None = None
    special: bool | None = None
    windows: int | None = None
    fullscreen: bool | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandVersion:
    """Hyprland Version."""

    version: str
    tag: str
    commit: str
    branch: str
    config_provider: str | None = None
    backend: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandScreencast:
    """Hyprland Screencast."""

    type: HyprlandScreencastType
    display: str | None = None
    window: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandReserved:
    """Hyprland Reserved."""

    top: int
    right: int
    bottom: int
    left: int


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandLayers:
    """Hyprland Layers."""

    background: list[str] = field(default_factory=list)
    bottom: list[str] = field(default_factory=list)
    top: list[str] = field(default_factory=list)
    overlay: list[str] = field(default_factory=list)


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandDisplay:
    """Hyprland Display."""

    scale: float
    transform: int
    vrr: bool
    tearing: bool
    direct_scanout: bool
    dpms: bool
    reserved: HyprlandReserved
    layers: HyprlandLayers
    colour_preset: str | None = None
    format: str | None = None
    mirror_of: str | None = None
    special_workspace: str | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.reserved, dict):
            self.reserved = HyprlandReserved(**self.reserved)

        if isinstance(self.layers, dict):
            self.layers = HyprlandLayers(**self.layers)


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandKeyboard:
    """Hyprland Keyboard."""

    name: str
    active_layout: int
    main: bool
    layouts: list[str] = field(default_factory=list)
    variant: str | None = None
    options: str | None = None
    active_keymap: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandMouse:
    """Hyprland Mouse."""

    name: str
    speed: float
    scroll_factor: float


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandGlobalShortcut:
    """Hyprland Global Shortcut."""

    name: str
    description: str


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandWindow:
    """Hyprland Window.

    focus_history is 0 for the most recently focused window.
    """

    fullscreen_mode: HyprlandFullscreenMode
    pinned: bool
    xwayland: bool
    hidden: bool
    focus_history: int
    tearing_hint: bool
    group: list[str] = field(default_factory=list)
    swallowing: str | None = None
    tags: list[str] = field(default_factory=list)
    initial_app: str | None = None
    xdg_tag: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class HyprlandWorkspace:
    """Hyprland Workspace."""

    persistent: bool
    layout: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class Hyprland:
    """What only Hyprland reports.

    Its maps are keyed by the shared display, window and workspace IDs.
    """

    version: HyprlandVersion
    group_lock: bool
    submap: str | None = None
    screencasts: list[HyprlandScreencast] = field(default_factory=list)
    config_errors: list[str] = field(default_factory=list)
    displays: dict[str, HyprlandDisplay] = field(default_factory=dict)
    keyboards: list[HyprlandKeyboard] = field(default_factory=list)
    mice: list[HyprlandMouse] = field(default_factory=list)
    tablets: list[str] = field(default_factory=list)
    touch: list[str] = field(default_factory=list)
    switches: list[str] = field(default_factory=list)
    global_shortcuts: list[HyprlandGlobalShortcut] = field(default_factory=list)
    windows: dict[str, HyprlandWindow] = field(default_factory=dict)
    workspaces: dict[str, HyprlandWorkspace] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.version, dict):
            self.version = HyprlandVersion(**self.version)

        self.screencasts = [
            HyprlandScreencast(**cast(dict, s)) if isinstance(s, dict) else s
            for s in self.screencasts or []
        ]
        self.displays = {
            k: HyprlandDisplay(**cast(dict, v)) if isinstance(v, dict) else v
            for k, v in (self.displays or {}).items()
        }
        self.keyboards = [
            HyprlandKeyboard(**cast(dict, k)) if isinstance(k, dict) else k
            for k in self.keyboards or []
        ]
        self.mice = [
            HyprlandMouse(**cast(dict, m)) if isinstance(m, dict) else m
            for m in self.mice or []
        ]
        self.global_shortcuts = [
            HyprlandGlobalShortcut(**cast(dict, s)) if isinstance(s, dict) else s
            for s in self.global_shortcuts or []
        ]
        self.windows = {
            k: HyprlandWindow(**cast(dict, v)) if isinstance(v, dict) else v
            for k, v in (self.windows or {}).items()
        }
        self.workspaces = {
            k: HyprlandWorkspace(**cast(dict, v)) if isinstance(v, dict) else v
            for k, v in (self.workspaces or {}).items()
        }


@filter_unexpected_fields
@dataclass(slots=True)
class Desktop:
    """Desktop: its windows, workspaces and keyboard layout.

    Fields a platform can't provide are None, and hyprland is only set on
    Hyprland.
    """

    compositor: DesktopCompositor
    keyboard: DesktopKeyboard
    focused_window: str | None = None
    focused_workspace: str | None = None
    windows: list[DesktopWindow] = field(default_factory=list)
    workspaces: list[DesktopWorkspace] = field(default_factory=list)
    hyprland: Hyprland | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.keyboard, dict):
            self.keyboard = DesktopKeyboard(**self.keyboard)

        self.windows = [
            DesktopWindow(**cast(dict, w)) if isinstance(w, dict) else w
            for w in self.windows or []
        ]
        self.workspaces = [
            DesktopWorkspace(**cast(dict, w)) if isinstance(w, dict) else w
            for w in self.workspaces or []
        ]

        if isinstance(self.hyprland, dict):
            self.hyprland = Hyprland(**self.hyprland)
