"""System Bridge: Server Handler - Media"""
from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import datetime
import io
import mimetypes
import os
import re
import tempfile
from typing import Optional
from urllib.parse import urlencode

import aiofiles
from aiohttp import ClientSession
from mutagen import File as MutagenFile
from plyer import storagepath
from sanic.request import Request
from sanic.response import HTTPResponse, file, json
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
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.settings import Settings


def get_directories(settings: Settings) -> list[dict]:
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
) -> list[dict]:
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
) -> Optional[dict]:
    """Get file from path"""
    try:
        stat = os.stat(filepath)
    except FileNotFoundError:
        return None

    mime_type = None
    if os.path.isfile(filepath):
        mime_type = mimetypes.guess_type(filepath)[0]

    return {
        "name": os.path.basename(filepath),
        "path": filepath.removeprefix(base_path)[1:],
        "fullpath": filepath,
        "size": stat.st_size,
        "last_accessed": stat.st_atime,
        "created": stat.st_ctime,
        "modified": stat.st_mtime,
        "is_directory": os.path.isdir(filepath),
        "is_file": os.path.isfile(filepath),
        "is_link": os.path.islink(filepath),
        "mime_type": mime_type,
    }


async def get_file_data(
    filepath: str,
) -> HTTPResponse:
    """Get file data"""
    return await file(filepath)


async def handler_media_directories(
    _: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handler for media directories"""
    return json(
        {
            "directories": get_directories(settings),
        }
    )


async def handler_media_files(
    request: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handler for media files"""
    if not (query_base := request.args.get(QUERY_BASE)):
        return json(
            {"message": "No base specified"},
            status=400,
        )

    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        return json(
            {"message": "Cannot find base", "base": query_base},
            status=404,
        )

    query_path = request.args.get(QUERY_PATH)
    path = os.path.join(root_path, query_path) if query_path else root_path
    if not os.path.exists(path):
        return json(
            {"message": "Cannot find path", "path": path},
            status=404,
        )
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        return json(
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
            status=400,
        )
    if not os.path.isdir(path):
        return json(
            {"message": "Path is not a directory", "path": path},
            status=400,
        )

    return json(
        {
            "files": get_files(settings, query_base, path),
            "path": path,
        }
    )


async def handler_media_file(
    request: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handler for media file requests"""
    if not (query_base := request.args.get(QUERY_BASE)):
        return json(
            {"message": "No base specified"},
            status=400,
        )

    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        return json(
            {"message": "Cannot find base", "base": query_base},
            status=404,
        )

    if not (query_path := request.args.get(QUERY_PATH)):
        return json(
            {"message": "No path specified"},
            status=400,
        )
    path = os.path.join(root_path, query_path)
    if not os.path.exists(path):
        return json(
            {"message": "Cannot find path", "path": path},
            status=404,
        )
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        return json(
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
            status=400,
        )
    if not os.path.isfile(path):
        return json(
            {"message": "Path is not a file", "path": path},
            status=400,
        )

    return json(get_file(root_path, path))


async def handler_media_file_data(
    request: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handler for media file requests"""
    if not (query_base := request.args.get(QUERY_BASE)):
        return json(
            {"message": "No base specified"},
            status=400,
        )

    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        return json(
            {"message": "Cannot find base", "base": query_base},
            status=404,
        )

    query_path = request.args.get(QUERY_PATH)
    if not (path := os.path.join(root_path, query_path)):
        return json(
            {"message": "Cannot find path", "path": path},
            status=400,
        )
    if not os.path.exists(path):
        return json(
            {"message": "File does not exist", "path": path},
            status=404,
        )
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        return json(
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
            status=400,
        )
    if not os.path.isfile(path):
        return json(
            {"message": "Path is not a file", "path": path},
            status=400,
        )

    return await get_file_data(path)


async def handler_media_file_write(
    request: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handler for media file write requests"""
    if not (query_base := request.args.get(QUERY_BASE)):
        return json(
            {"message": "No base specified"},
            status=400,
        )

    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        return json(
            {"message": "Cannot find base", "base": query_base},
            status=404,
        )

    if not (query_path := request.args.get(QUERY_PATH)):
        return json(
            {"message": "No path specified"},
            status=400,
        )
    if not (query_filename := request.args.get(QUERY_FILENAME)):
        return json(
            {"message": "No filename specified"},
            status=400,
        )
    if not (path := os.path.join(root_path, query_path)):
        return json(
            {"message": "Cannot find path", "path": path},
            status=400,
        )
    if not request.body:
        return json(
            {"message": "No file specified"},
            status=400,
        )

    if not os.path.exists(path):
        os.makedirs(path)
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        return json(
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
            status=400,
        )
    async with aiofiles.open(os.path.join(path, query_filename), "wb") as new_file:
        await new_file.write(request.body)
        await new_file.close()

    return json(
        {
            "message": "File uploaded",
            "path": path,
            "filename": query_filename,
        }
    )


async def handler_media_play(
    request: Request,
    settings: Settings,
    callback: Callable[[str, MediaPlay], None],
) -> HTTPResponse:
    """Handler for media play requests"""
    media_type = request.args.get("type", "video")
    mime_type = None
    path = None
    if "url" not in request.args:
        if not (query_base := request.args.get(QUERY_BASE)):
            return json(
                {"message": "No base specified"},
                status=400,
            )

        root_path = None
        for item in get_directories(settings):
            if item["key"] == query_base:
                root_path = item["path"]
                break

        if root_path is None or not os.path.exists(root_path):
            return json(
                {"message": "Cannot find base", "base": query_base},
                status=404,
            )

        query_path = request.args.get(QUERY_PATH)
        if not (path := os.path.join(root_path, query_path)):
            return json(
                {"message": "Cannot find path", "path": path},
                status=400,
            )
        if not os.path.exists(path):
            return json(
                {"message": "File does not exist", "path": path},
                status=404,
            )
        if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
            return json(
                {
                    "message": "Path is not underneath base path",
                    "base": root_path,
                    "path": path,
                },
                status=400,
            )
        if not os.path.isfile(path):
            return json(
                {"message": "Path is not a file", "path": path},
                status=400,
            )

        url = f"""{request.scheme}://{request.host}/api/media/file/data?{urlencode({
                        QUERY_API_KEY: settings.get_secret(SECRET_API_KEY),
                        QUERY_API_PORT: settings.get(SETTING_PORT_API),
                        QUERY_BASE: query_base,
                        QUERY_PATH: query_path,
                    })}"""

        mime_type, _ = mimetypes.guess_type(path)
        if mime_type is None:
            return json(
                {"message": "Cannot determine mime type", "path": path},
                status=400,
            )

        media_type = (
            "audio"
            if "audio" in mime_type
            else "video"
            if "video" in mime_type
            else None
        )

        if media_type is None:
            return json(
                {
                    "message": "Unsupported file type",
                    "path": path,
                    "mime_type": mime_type,
                },
                status=400,
            )
    else:
        url = request.args.get("url")

        if media_type == "audio":
            path = os.path.join(tempfile.gettempdir(), "tmp.mp3")
            # Download local version to get metadata
            async with ClientSession() as session:
                async with session.get(url) as response:
                    data = await response.read()
                    async with aiofiles.open(
                        path,
                        "wb",
                    ) as new_file:
                        await new_file.write(data)
                        await new_file.close()

    media_play = MediaPlay(
        **{
            QUERY_AUTOPLAY: bool(request.args.get(QUERY_AUTOPLAY, default=False)),
            QUERY_URL: url,
            QUERY_VOLUME: float(request.args.get(QUERY_VOLUME, default=40)),
        }
    )

    api_port = settings.get(SETTING_PORT_API)
    api_key = settings.get_secret(SECRET_API_KEY)

    if media_type == "audio":
        if path is None:
            return json(
                {
                    "message": "Failed to get path for audio file",
                },
                status=400,
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
                    cover_filename = _save_cover_from_binary(
                        cover.data,
                        cover.mime,
                        media_play.album,
                    )
                    if cover_filename is not None:
                        media_play.cover = f"""{request.scheme}://{request.host}/api/media/file/data?{urlencode({
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
                        media_play.cover = f"""{request.scheme}://{request.host}/api/media/file/data?{urlencode({
                                                QUERY_API_KEY: settings.get_secret(SECRET_API_KEY),
                                                QUERY_API_PORT: settings.get(SETTING_PORT_API),
                                                QUERY_BASE: "pictures",
                                                QUERY_PATH: cover_filename,
                                            })}"""
                        asyncio.create_task(_delete_cover_delayed(cover_filename))
            except AttributeError:
                pass

    callback(media_type, media_play)

    return json(
        {
            "message": "Opened media player",
            "media_type": media_type,
            "mime_type": mime_type,
            "path": path,
            "player_url": f"""{request.scheme}://{request.host}/app/player/{media_type}.html?{urlencode({
                    QUERY_API_KEY: api_key,
                    QUERY_API_PORT: api_port,
                    **media_play.dict(exclude_none=True),
                })}""",
            **media_play.dict(exclude_none=True),
        }
    )


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
