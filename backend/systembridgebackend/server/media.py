"""System Bridge: Server Handler - Media"""
from __future__ import annotations

import asyncio
import io
import mimetypes
import os
import re
import tempfile
from collections.abc import Callable
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode

import aiofiles
from aiohttp import ClientSession
from fastapi.responses import FileResponse
from mutagen._file import File as MutagenFile
from plyer import storagepath
from systembridgeshared.const import (
    QUERY_API_KEY,
    QUERY_API_PORT,
    QUERY_AUTOPLAY,
    QUERY_BASE,
    QUERY_FILENAME,
    QUERY_PATH,
    QUERY_URL,
    QUERY_VOLUME,
    SECRET_API_KEY,
    SETTING_ADDITIONAL_MEDIA_DIRECTORIES,
    SETTING_PORT_API,
)
from systembridgeshared.models.media_files import File as MediaFile
from systembridgeshared.models.media_files import MediaFiles
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.settings import Settings


def get_directories(settings: Settings) -> list[dict[str, str]]:
    """Get directories"""
    directories = [
        {
            "key": "documents",
            "path": storagepath.get_documents_dir(),  # type: ignore
        },
        {
            "key": "downloads",
            "path": storagepath.get_downloads_dir(),  # type: ignore
        },
        {
            "key": "home",
            "path": storagepath.get_home_dir(),  # type: ignore
        },
        {
            "key": "music",
            "path": storagepath.get_music_dir(),  # type: ignore
        },
        {
            "key": "pictures",
            "path": storagepath.get_pictures_dir(),  # type: ignore
        },
        {
            "key": "videos",
            "path": storagepath.get_videos_dir(),  # type: ignore
        },
    ]

    additional_directories = settings.get(SETTING_ADDITIONAL_MEDIA_DIRECTORIES)
    if additional_directories is not None and isinstance(additional_directories, list):
        for directory in additional_directories:
            directories.append(
                {
                    "key": directory["name"],
                    "path": directory["value"],
                }
            )

    return directories


def get_files(
    settings: Settings,
    base_path: str,
    path: str,
) -> list[MediaFile]:
    """Get files from path"""
    root_path = None
    for item in get_directories(settings):
        if item["key"] == base_path:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        return []

    files_info = []
    for filename in os.listdir(path):
        file_info = get_file(root_path, os.path.join(path, filename))
        if file_info is not None:
            files_info.append(file_info)

    return files_info


def get_file(
    base_path: str,
    filepath: str,
) -> Optional[MediaFile]:
    """Get file from path"""
    try:
        stat = os.stat(filepath)
    except FileNotFoundError:
        return None

    mime_type = None
    if os.path.isfile(filepath):
        mime_type = mimetypes.guess_type(filepath)[0]

    return MediaFile(
        name=os.path.basename(filepath),
        path=filepath.removeprefix(base_path)[1:],
        fullpath=filepath,
        size=stat.st_size,
        last_accessed=stat.st_atime,
        created=stat.st_ctime,
        modified=stat.st_mtime,
        is_directory=os.path.isdir(filepath),
        is_file=os.path.isfile(filepath),
        is_link=os.path.islink(filepath),
        mime_type=mime_type,
    )


def get_file_data(
    filepath: str,
) -> FileResponse:
    """Get file data"""
    return FileResponse(filepath)


async def write_file(
    filepath: str,
    data: bytes,
) -> None:
    """Write file"""
    async with aiofiles.open(filepath, "wb") as new_file:
        await new_file.write(data)
        await new_file.close()
