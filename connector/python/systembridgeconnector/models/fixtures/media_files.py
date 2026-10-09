"""Fixture for media files."""

from systembridgeconnector.models.media_files import MediaFile, MediaFiles

FIXTURE_MEDIA_FILES = MediaFiles(
    files=[
        MediaFile(
            name="file1",
            path="/full/path/to/file1",
            size=100,
            is_directory=False,
            mod_time=100.0,
            permissions="-rw-r--r--",
            content_type="text/plain",
            extension=".txt",
        ),
    ],
    path="path/to/file",
)
