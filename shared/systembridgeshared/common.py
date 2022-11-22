"""System Bridge Shared: Common"""
from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any, Union

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
    value: str | None,
) -> Union[bool, float, int, str, list[Any], dict[str, Any], None]:
    """Convert string to correct data type"""
    if value is None:
        return None
    try:
        if value.startswith("'") and value.endswith("'"):
            return convert_string_to_correct_type(value[1:-1])
        if (value.startswith("[") and value.endswith("]")) or (
            value.startswith("{") and value.endswith("}")
        ):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        value_lower = value.lower()
        if value_lower in ("none", "null", "nan"):
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


def make_key(key_input: str) -> str:
    """Make a key from a string"""
    return (
        key_input.replace(" ", "_", -1)
        .replace("(", "", -1)
        .replace(")", "", -1)
        .replace("\\", "", -1)
        .replace(".", "", -1)
        .lower()
    )


def asyncio_get_loop() -> asyncio.AbstractEventLoop:
    """Get the event loop"""
    try:
        loop = asyncio.get_event_loop()
        if not loop.is_running():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop
