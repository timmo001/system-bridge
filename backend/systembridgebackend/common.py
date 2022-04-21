"""System Bridge: Common"""
from __future__ import annotations

COLUMN_KEY = "key"
COLUMN_VALUE = "value"
COLUMN_TIMESTAMP = "timestamp"


def convert_string_to_correct_type(
    value: str,
) -> str | int | float | bool | None:
    """Convert string to correct data type"""
    try:
        if value.lower() == "none":
            return None
        if value.lower() == "true":
            return True
        if value.lower() == "false":
            return False
        if value.isalpha():
            return value
        if value.isdigit():
            return int(value)
        return float(value)
    except ValueError:
        return value
