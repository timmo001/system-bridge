"""System Bridge: Server Handler - Keyboard"""
from keyboard import press_and_release, write


def keyboard_keypress(key: str):
    """Press a keyboard key"""
    press_and_release(key)


def keyboard_text(text: str):
    """Type text"""
    write(text)
