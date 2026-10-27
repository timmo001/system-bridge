"""Desktop Control."""

from dataclasses import dataclass
from enum import StrEnum


class HyprlandDirection(StrEnum):
    """A direction for a Hyprland dispatcher."""

    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"
    UP = "up"


class HyprlandDispatcher(StrEnum):
    """A Hyprland dispatcher System Bridge can run on the focused window."""

    CENTER_WINDOW = "center_window"
    CYCLE_NEXT_WINDOW = "cycle_next_window"
    CYCLE_PREVIOUS_WINDOW = "cycle_previous_window"
    MOVE_FOCUS = "move_focus"
    SWAP_WINDOW = "swap_window"
    TOGGLE_GROUP = "toggle_group"
    TOGGLE_SPLIT = "toggle_split"


class OmarchyAction(StrEnum):
    """What to do with an Omarchy shell panel or menu."""

    CLOSE = "close"
    OPEN = "open"
    TOGGLE = "toggle"


@dataclass(slots=True)
class DesktopKeyboardLayoutRequest:
    """A layout from the desktop module's keyboard.layouts."""

    layout: str


@dataclass(slots=True)
class DesktopWindowRequest:
    """A window, by its id from the desktop module."""

    id: str


@dataclass(slots=True)
class DesktopWindowStateRequest:
    """Desktop Window State Request.

    Makes a window fullscreen, maximised or minimised, or not. A state left as
    None stays as it is. Hyprland can't minimise, and Windows can't make a
    window fullscreen.
    """

    id: str
    fullscreen: bool | None = None
    maximised: bool | None = None
    minimised: bool | None = None


@dataclass(slots=True)
class DesktopWorkspaceRequest:
    """A workspace, by its id from the desktop module."""

    id: str


@dataclass(slots=True)
class HyprlandDispatchRequest:
    """Hyprland Dispatch Request.

    Runs a dispatcher on the focused window, as its bind would. move_focus and
    swap_window take a direction.
    """

    dispatcher: HyprlandDispatcher
    direction: HyprlandDirection | None = None


@dataclass(slots=True)
class HyprlandEvent:
    """Hyprland Event.

    A custom event from Hyprland's event dispatcher, such as a bind to
    hl.dsp.event("dock"). data is what the bind passed.
    """

    data: str


@dataclass(slots=True)
class HyprlandGlobalShortcutRequest:
    """A global shortcut's name from the desktop module's hyprland.global_shortcuts."""

    name: str


@dataclass(slots=True)
class HyprlandMoveWindowRequest:
    """Hyprland Move Window Request.

    Moves a window to a workspace, leaving the focus where it is. workspace is
    a workspace id from the desktop module, or the number of a new one.
    """

    id: str
    workspace: str


@dataclass(slots=True)
class HyprlandSetWindowRequest:
    """Hyprland Set Window Request.

    Floats or tiles a window, and pins or unpins it. A setting left as None
    stays as it is. Only floating windows can be pinned.
    """

    id: str
    floating: bool | None = None
    pinned: bool | None = None


@dataclass(slots=True)
class HyprlandSubmapRequest:
    """Hyprland Submap Request.

    Switches binds to a submap the desktop module's hyprland.binds are in, or
    back to the default when name is None.
    """

    name: str | None = None


@dataclass(slots=True)
class OmarchyMenuRequest:
    """Omarchy Menu Request.

    Opens, closes or toggles the Omarchy menu at a route from the desktop
    module's omarchy.menus, or one of its aliases. Closing needs no id.
    """

    action: OmarchyAction
    id: str | None = None


@dataclass(slots=True)
class OmarchyPanelRequest:
    """A panel from the desktop module's omarchy.panels, and what to do with it."""

    id: str
    action: OmarchyAction
