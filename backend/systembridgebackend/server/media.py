"""System Bridge: Server Handler - Media"""
from __future__ import annotations

import mimetypes
import os

import aiofiles
from plyer import storagepath
from sanic.request import Request
from sanic.response import HTTPResponse, file, json
from systembridgeshared.const import SETTING_ADDITIONAL_MEDIA_DIRECTORIES
from systembridgeshared.settings import Settings

QUERY_BASE = "base"
QUERY_PATH = "path"
QUERY_FILENAME = "filename"


def get_directories(settings: Settings) -> list[dict]:
    """Get directories"""
    directories = [
        {
            "key": "documents",
            "path": storagepath.get_documents_dir(),
        },
        {
            "key": "downloads",
            "path": storagepath.get_downloads_dir(),
        },
        {
            "key": "home",
            "path": storagepath.get_home_dir(),
        },
        {
            "key": "music",
            "path": storagepath.get_music_dir(),
        },
        {
            "key": "pictures",
            "path": storagepath.get_pictures_dir(),
        },
        {
            "key": "videos",
            "path": storagepath.get_videos_dir(),
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
) -> dict | None:
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
