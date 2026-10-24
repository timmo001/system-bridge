"""Desktop Control."""

from dataclasses import dataclass


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
