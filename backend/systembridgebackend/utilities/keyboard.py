"""System Bridge: Keyboard Utilities"""
from collections.abc import Callable

from keyboard import (
    add_hotkey,
    press_and_release,
    remove_hotkey,
    unhook_all_hotkeys,
    write,
)


def keyboard_keypress(key: str) -> None:
    """Press a keyboard key"""
    press_and_release(key)


def keyboard_text(text: str) -> None:
    """Type text"""
    write(text)


def keyboard_hotkey_register(
    key: str,
    callback: Callable,
) -> None:
    """Register a hotkey"""
    add_hotkey(key, callback)


def keyboard_hotkey_unregister(key: str) -> None:
    """Unregister a hotkey"""
    remove_hotkey(key)


def keyboard_hotkey_unregister_all() -> None:
    """Unregister all hotkeys"""
    unhook_all_hotkeys()
