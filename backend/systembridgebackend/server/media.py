"""System Bridge: Server Handler - Media"""
from __future__ import annotations

import asyncio
from datetime import datetime
import io
import logging
import mimetypes
import os
from os import listdir
from os.path import abspath, basename, exists, isdir, isfile, islink, join
from re import sub
import tempfile
from typing import Optional
from urllib.parse import urlencode

import aiofiles
from aiohttp import ClientSession
from fastapi import HTTPException
from fastapi.responses import FileResponse
from mutagen import File as MutagenFile
from plyer import storagepath
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND
from systembridgeshared.const import (
    QUERY_API_KEY,
    QUERY_API_PORT,
    QUERY_AUTOPLAY,
    QUERY_URL,
    QUERY_VOLUME,
    SECRET_API_KEY,
    SETTING_ADDITIONAL_MEDIA_DIRECTORIES,
    SETTING_PORT_API,
)
from systembridgeshared.models.media_directories import Directory, MediaDirectories
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.settings import Settings

from ..gui import start_gui_threaded


def get_directories(settings: Settings) -> MediaDirectories:
    """Get directories"""
    directories = [
        Directory(
            key="documents",
            path=storagepath.get_documents_dir(),  # type: ignore
        ),
        Directory(
            key="downloads",
            path=storagepath.get_downloads_dir(),  # type: ignore
        ),
        Directory(
            key="home",
            path=storagepath.get_home_dir(),  # type: ignore
        ),
        Directory(
            key="music",
            path=storagepath.get_music_dir(),  # type: ignore
        ),
        Directory(
            key="pictures",
            path=storagepath.get_pictures_dir(),  # type: ignore
        ),
        Directory(
            key="videos",
            path=storagepath.get_videos_dir(),  # type: ignore
        ),
    ]

    additional_directories = settings.get(SETTING_ADDITIONAL_MEDIA_DIRECTORIES)
    if additional_directories is not None and isinstance(additional_directories, list):
        for directory in additional_directories:
            directories.append(
                Directory(
                    key=directory["name"],
                    path=directory["value"],
                )
            )

    return MediaDirectories(directories=directories)


def get_files(
    settings: Settings,
    base_path: str,
    path: str,
) -> list[dict]:
    """Get files from path"""
    root_path = None
    for item in get_directories(settings).directories:
        if item.key == base_path:
            root_path = item.path
            break

    if root_path is None or not exists(root_path):
        return []

    files_info = []
    for filename in listdir(path):
        file_info = get_file(root_path, join(path, filename))
        if file_info is not None:
            files_info.append(file_info)

    return files_info


def get_file(
    base_path: str,
    filepath: str,
) -> Optional[dict]:
    """Get file from path"""
    try:
        stat = os.stat(filepath)
    except FileNotFoundError:
        return None

    mime_type = None
    if isfile(filepath):
        mime_type = mimetypes.guess_type(filepath)[0]

    return {
        "name": basename(filepath),
        "path": filepath.removeprefix(base_path)[1:],
        "fullpath": filepath,
        "size": stat.st_size,
        "last_accessed": stat.st_atime,
        "created": stat.st_ctime,
        "modified": stat.st_mtime,
        "is_directory": isdir(filepath),
        "is_file": isfile(filepath),
        "is_link": islink(filepath),
        "mime_type": mime_type,
    }


def get_file_data(
    filepath: str,
) -> FileResponse:
    """Get file data"""
    return FileResponse(filepath)


async def write_file(
    path: str,
    filename: str,
    data: bytes,
) -> None:
    """Write file."""
    async with aiofiles.open(join(path, filename), "wb") as new_file:
        await new_file.write(data)
        await new_file.close()


async def _delete_cover_delayed(
    file_name: str,
    delay: float = 20,
) -> None:
    """Delete cover after delay."""
    await asyncio.sleep(delay)
    file_path = join(
        storagepath.get_pictures_dir(),  # type: ignore
        file_name,
    )
    if exists(file_path):
        os.remove(file_path)


def save_cover_from_binary(
    data: bytes,
    mime_type: str,
    name: Optional[str],
) -> str:
    """Save cover from binary."""
    cover_extension = mimetypes.guess_extension(mime_type)
    file_name = sub(
        "[^-a-zA-Z0-9_.() ]+",
        "",
        f"{name if name is not None else 'unknown'}__{datetime.timestamp(datetime.now())}{cover_extension}",
    )
    file_path = join(
        storagepath.get_pictures_dir(),  # type: ignore
        file_name,
    )
    with io.open(file_path, "wb") as cover_file:
        cover_file.write(data)
    return file_name


async def handler_media_play(
    settings: Settings,
    query: MediaPlay,
) -> dict:
    """Handler for media play requests"""
    media_type = query.type
    mime_type = None
    path = None
    if query.url is None:
        if query.base is None:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"No base specified: {path}",
            )

        root_path = None
        for item in get_directories(settings).directories:
            if item.key == query.base:
                root_path = item.path
                break

        if root_path is None or not exists(root_path):
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail=f"Cannot find base: {query.base}",
            )

        if (path := join(root_path, query.path)) is None:  # type: ignore
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail=f"Cannot find path: {query.path}",
            )
        if not exists(path):
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Cannot find path: {path}",
            )
        if not abspath(path).startswith(abspath(root_path)):
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Path is not in base: {path}",
            )
        if not isfile(path):
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Path is not a file: {path}",
            )

        mime_type, _ = mimetypes.guess_type(path)
        if mime_type is None:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Cannot determine mime type: {path}",
            )

        media_type = (
            "audio"
            if "audio" in mime_type
            else "video"
            if "video" in mime_type
            else None
        )

        if media_type is None:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {path} - {mime_type}",
            )
    else:
        if media_type == "audio":
            path = join(tempfile.gettempdir(), "tmp.mp3")
            # Download local version to get metadata
            async with ClientSession() as session:
                async with session.get(query.url) as response:
                    data = await response.read()
                    async with aiofiles.open(
                        path,
                        "wb",
                    ) as new_file:
                        await new_file.write(data)
                        await new_file.close()

    media_play = MediaPlay(
        **{
            QUERY_AUTOPLAY: bool(query.autoplay),
            QUERY_URL: query.url,
            QUERY_VOLUME: float(query.volume) if query.volume is not None else 40,
        }
    )

    api_port = settings.get(SETTING_PORT_API)
    api_key = settings.get_secret(SECRET_API_KEY)

    if media_type == "audio":
        if path is None:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail="Failed to get path for audio file",
            )
        metadata = MutagenFile(path)

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
                    cover_filename = save_cover_from_binary(
                        cover.data,
                        cover.mime,
                        media_play.album,
                    )
                    if cover_filename is not None:
                        media_play.cover = f"""/api/media/file/data?{urlencode({
                                                QUERY_API_KEY: settings.get_secret(SECRET_API_KEY),
                                                QUERY_API_PORT: settings.get(SETTING_PORT_API),
                                                query.base: "pictures",
                                                query.path: cover_filename,
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
                    cover_filename = save_cover_from_binary(
                        metadata.pictures[0].data,
                        metadata.pictures[0].mime,
                        media_play.album,
                    )
                    if cover_filename is not None:
                        media_play.cover = f"""/api/media/file/data?{urlencode({
                                                QUERY_API_KEY: settings.get_secret(SECRET_API_KEY),
                                                QUERY_API_PORT: settings.get(SETTING_PORT_API),
                                                query.base: "pictures",
                                                query.path: cover_filename,
                                            })}"""
                        asyncio.create_task(_delete_cover_delayed(cover_filename))
            except AttributeError:
                pass

    start_gui_threaded(
        logging.getLogger(__name__),
        settings,
        "media-player",
        media_type,
        media_play.json(),
    )

    return {
        "message": "Opened media player",
        "media_type": media_type,
        "mime_type": mime_type,
        "path": path,
        "player_url": f"""/app/player/{media_type}.html?{urlencode({
                    QUERY_API_KEY: api_key,
                    QUERY_API_PORT: api_port,
                    **media_play.dict(exclude_none=True),
                })}""",
        **media_play.dict(exclude_none=True),
    }
