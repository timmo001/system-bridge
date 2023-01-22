"""System Bridge: Keyboard Utilities"""
from typing import Callable

from keyboard import add_hotkey, press_and_release, remove_hotkey, write


def keyboard_keypress(key: str):
    """Press a keyboard key"""
    press_and_release(key)


def keyboard_text(text: str):
    """Type text"""
    write(text)


def keyboard_hotkey_register(key: str, callback: Callable):
    """Register a hotkey"""
    add_hotkey(key, callback)


def keyboard_hotkey_unregister(key: str):
    """Unregister a hotkey"""
    remove_hotkey(key)
