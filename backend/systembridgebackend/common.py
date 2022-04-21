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
