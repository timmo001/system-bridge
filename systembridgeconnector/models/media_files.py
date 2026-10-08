"""Media Files."""

from __future__ import annotations

from dataclasses import MISSING, dataclass, fields
from typing import Any, cast


def _normalize_media_file_kwargs(kwargs: dict[str, Any]) -> dict[str, Any]:
    """Normalize camelCase JSON keys to snake_case for MediaFile."""
    key_mapping = {
        "isDirectory": "is_directory",
        "modTime": "mod_time",
        "contentType": "content_type",
    }
    normalized: dict[str, Any] = {}
    for key, value in kwargs.items():
        normalized[key_mapping.get(key, key)] = value
    return normalized


@dataclass(slots=True)
class MediaFile:
    """Media File."""

    name: str
    path: str
    size: int
    is_directory: bool
    mod_time: float
    permissions: str
    content_type: str | None = None
    extension: str | None = None

    def __init__(self, **kwargs: Any) -> None:
        """Initialize MediaFile, converting camelCase JSON keys to snake_case."""
        # Normalize camelCase keys from Go API to snake_case
        normalized = _normalize_media_file_kwargs(kwargs)
        # Filter to expected fields only
        expected_fields = {field.name for field in fields(MediaFile)}
        cleaned = {k: v for k, v in normalized.items() if k in expected_fields}
        # Set attributes directly (works with slots)
        for field in fields(MediaFile):
            if field.name in cleaned:
                object.__setattr__(self, field.name, cleaned[field.name])
            elif field.default is not MISSING:
                object.__setattr__(self, field.name, field.default)
            elif field.default_factory is not MISSING:
                object.__setattr__(self, field.name, field.default_factory())
            else:
                raise TypeError(f"Missing required field: {field.name}")


@dataclass(slots=True)
class MediaFiles:
    """Media Files."""

    files: list[MediaFile]
    path: str

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.files, list) and all(
            isinstance(item, dict) for item in self.files
        ):
            new_files: list[MediaFile] = []
            for f in self.files:
                file: dict = cast(dict, f)
                new_files.append(MediaFile(**file))
            self.files = new_files
