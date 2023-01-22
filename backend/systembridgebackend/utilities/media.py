"""System Bridge: Media Utilities"""
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
from fastapi import status
from fastapi.exceptions import HTTPException
from fastapi.responses import FileResponse
from mutagen._file import File as MutagenFile
from plyer import storagepath
from systembridgeshared.const import (
    QUERY_API_KEY,
    QUERY_API_PORT,
    QUERY_AUTOPLAY,
    QUERY_BASE,
    QUERY_PATH,
    QUERY_URL,
    QUERY_VOLUME,
    SECRET_API_KEY,
    SETTING_ADDITIONAL_MEDIA_DIRECTORIES,
    SETTING_PORT_API,
)
from systembridgeshared.models.media_files import File as MediaFile
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


async def play_media(
    settings: Settings,
    callback: Callable[[str, MediaPlay], None],
    query_autoplay: Optional[bool] = False,
    query_base: Optional[str] = None,
    query_path: Optional[str] = None,
    query_type: Optional[str] = "video",
    query_url: Optional[str] = None,
    query_volume: Optional[float] = 40,
    request_host: Optional[str] = None,
    request_scheme: Optional[str] = "http",
):
    """Handler for media play requests"""
    mime_type = None
    path = None
    if query_url is None:
        if query_base is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {"message": "No base specified"},
            )
        if query_path is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {"message": "No path specified"},
            )

        root_path = None
        for item in get_directories(settings):
            if item["key"] == query_base:
                root_path = item["path"]
                break

        if root_path is None or not os.path.exists(root_path):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                {"message": "Cannot find base", "base": query_base},
            )

        if not (path := os.path.join(root_path, query_path)):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {"message": "Cannot find path", "path": path},
            )
        if not os.path.exists(path):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                {"message": "File does not exist", "path": path},
            )
        if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {
                    "message": "Path is not underneath base path",
                    "base": root_path,
                    "path": path,
                },
            )
        if not os.path.isfile(path):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {"message": "Path is not a file", "path": path},
            )

        query_url = f"""{request_scheme}://{request_host}/api/media/file/data?{urlencode({
                        QUERY_API_KEY: settings.get_secret(SECRET_API_KEY),
                        QUERY_API_PORT: settings.get(SETTING_PORT_API),
                        QUERY_BASE: query_base,
                        QUERY_PATH: query_path,
                    })}"""

        mime_type, _ = mimetypes.guess_type(path)
        if mime_type is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {"message": "Cannot determine mime type", "path": path},
            )

        query_type = (
            "audio"
            if "audio" in mime_type
            else "video"
            if "video" in mime_type
            else None
        )

        if query_type is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {
                    "message": "Unsupported file type",
                    "path": path,
                    "mime_type": mime_type,
                },
            )
    else:
        if query_type == "audio":
            path = os.path.join(tempfile.gettempdir(), "tmp.mp3")
            # Download local version to get metadata
            async with ClientSession() as session:
                async with session.get(query_url) as response:
                    data = await response.read()
                    async with aiofiles.open(
                        path,
                        "wb",
                    ) as new_file:
                        await new_file.write(data)
                        await new_file.close()

    media_play = MediaPlay(
        **{
            QUERY_AUTOPLAY: query_autoplay,
            QUERY_URL: query_url,
            QUERY_VOLUME: query_volume,
        }
    )

    api_port = settings.get(SETTING_PORT_API)
    api_key = settings.get_secret(SECRET_API_KEY)

    if query_type == "audio":
        if path is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {
                    "message": "Failed to get path for audio file",
                },
            )

        if (metadata := MutagenFile(path)) is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                {
                    "message": "Failed to get metadata for audio file",
                },
            )

        album = metadata.get("album")
        if album is not None and len(album) > 0:
            media_play.album = album[0]
        elif (album := metadata.get("TALB")) is not None:
            media_play.album = album.text[0]

        artist = metadata.get("artist")
        if artist is not None and len(artist) > 0:
            media_play.artist = artist[0]
        elif (artist := metadata.get("TPE1")) is not None:
            media_play.artist = artist.text[0]

        title = metadata.get("title")
        if title is not None and len(title) > 0:
            media_play.title = title[0]
        elif (title := metadata.get("TIT2")) is not None:
            media_play.title = title.text[0]

        # MP3 etc.
        for key in metadata.keys():
            if key.startswith("APIC"):
                if (cover := metadata.get(key)) is not None:
                    cover_filename = _save_cover_from_binary(
                        cover.data,
                        cover.mime,
                        media_play.album,
                    )
                    if cover_filename is not None:
                        media_play.cover = f"""{request_scheme}://{request_host}/api/media/file/data?{urlencode({
                                                QUERY_API_KEY: settings.get_secret(SECRET_API_KEY),
                                                QUERY_API_PORT: settings.get(SETTING_PORT_API),
                                                QUERY_BASE: "pictures",
                                                QUERY_PATH: cover_filename,
                                            })}"""
                        asyncio.create_task(_delete_cover_delayed(cover_filename))
                    break

        # FLAC
        if media_play.cover is None:
            try:
                if (
                    getattr(metadata, "pictures") is not None
                    and len(metadata.pictures) > 0
                ):
                    cover_filename = _save_cover_from_binary(
                        metadata.pictures[0].data,
                        metadata.pictures[0].mime,
                        media_play.album,
                    )
                    if cover_filename is not None:
                        media_play.cover = f"""{request_scheme}://{request_host}/api/media/file/data?{urlencode({
                                                QUERY_API_KEY: settings.get_secret(SECRET_API_KEY),
                                                QUERY_API_PORT: settings.get(SETTING_PORT_API),
                                                QUERY_BASE: "pictures",
                                                QUERY_PATH: cover_filename,
                                            })}"""
                        asyncio.create_task(_delete_cover_delayed(cover_filename))
            except AttributeError:
                pass

    if query_type is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {
                "message": "Unsupported file type",
                "path": path,
                "mime_type": mime_type,
            },
        )

    callback(query_type, media_play)

    return {
        "message": "Opened media player",
        "media_type": query_type,
        "mime_type": mime_type,
        "path": path,
        "player_url": f"""{request_scheme}://{request_host}/app/player/{query_type}.html?{urlencode({
                    QUERY_API_KEY: api_key,
                    QUERY_API_PORT: api_port,
                    **media_play.dict(exclude_none=True),
                })}""",
        **media_play.dict(exclude_none=True),
    }


async def _delete_cover_delayed(
    file_name: str,
    delay: float = 20,
) -> None:
    """Delete cover after delay."""
    await asyncio.sleep(delay)
    file_path = os.path.join(
        storagepath.get_pictures_dir(),  # type: ignore
        file_name,
    )
    if os.path.exists(file_path):
        os.remove(file_path)


def _save_cover_from_binary(
    data: bytes,
    mime_type: str,
    name: Optional[str],
) -> str:
    """Save cover from binary."""
    cover_extension = mimetypes.guess_extension(mime_type)
    file_name = re.sub(
        "[^-a-zA-Z0-9_.() ]+",
        "",
        f"{name if name is not None else 'unknown'}__{datetime.timestamp(datetime.now())}{cover_extension}",
    )
    file_path = os.path.join(
        storagepath.get_pictures_dir(),  # type: ignore
        file_name,
    )
    with io.open(file_path, "wb") as cover_file:
        cover_file.write(data)
    return file_name
