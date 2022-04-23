"""System Bridge Shared: Common"""
from __future__ import annotations

import os
import re

from appdirs import AppDirs


def get_user_data_directory() -> str:
    """Get the user data directory"""
    user_data_dir = AppDirs("systembridge", "timmo001").user_data_dir
    # Create User Data Directories
    if not os.path.exists(user_data_dir):
        os.makedirs(user_data_dir, exist_ok=True)
    return user_data_dir


def camel_to_snake(name):
    """Convert camel case to snake case"""
    name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()


def convert_string_to_correct_type(
    value: str,
) -> str | int | float | bool | None:
    """Convert string to correct data type"""
    try:
        value_lower = value.lower()
        if value_lower in ("none", "null"):
            return None
        if value_lower == "true":
            return True
        if value_lower == "false":
            return False
        if value.isalpha():
            return value
        if value.isdigit():
            return int(value)
        return float(value)
    except ValueError:
        return value
