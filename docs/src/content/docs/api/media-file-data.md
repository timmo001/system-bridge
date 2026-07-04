---
title: Media - Get File Data
description: Download a media file from the machine running System Bridge over the HTTP API.
---

Download a media file from the machine running System Bridge. The file is returned as-is, so an image request returns the image bytes, an audio request returns the audio, and so on.

## Authentication

This endpoint requires your API token, passed as the `token` query parameter. A missing or invalid token returns `401 Unauthorized`. See [how to find your token](/using/cli/#token).

## Request

```http
GET /api/media/file/data?base={base}&path={path}&token={token}
```

- `base`: the base directory to serve from (see below).
- `path`: the path to the file, relative to `base`.
- `token`: your API token.

All three parameters are required.

### Base directories

`base` is one of the built-in keys:

- `documents`
- `downloads`
- `home`
- `music`
- `pictures`
- `videos`

You can also use any of your XDG user directories, or a custom directory configured in `media.directories` in your [settings](/api/websocket/system/#settings), by its name.

## Constraints

The endpoint only serves regular files that meet these limits:

- **File type**: the extension must be one of the allowed media types. Images (`jpg`, `jpeg`, `png`, `gif`, `bmp`, `webp`), audio (`mp3`, `wav`, `flac`, `aac`, `ogg`, `m4a`), video (`mp4`, `avi`, `mkv`, `mov`, `wmv`, `webm`), and documents (`txt`, `pdf`, `doc`, `docx`, `xls`, `xlsx`).
- **Size**: files larger than 100 MB are rejected.
- **Path safety**: `path` is resolved inside `base`. Attempts to escape the base directory (for example with `..`) are rejected.

## Response

On success, the file is streamed back with its `Content-Type`, `Content-Length`, and an inline `Content-Disposition` header.

### Errors

Errors return a JSON body of the form `{ "error": "..." }` with one of these status codes:

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | Missing `base`, `path`, or `token`, an invalid base directory, or the path is not a regular file. |
| `401 Unauthorized` | The token is missing or incorrect. |
| `403 Forbidden` | The path escapes the base directory, or the file type is not allowed. |
| `404 Not Found` | The file does not exist. |
| `413 Payload Too Large` | The file is larger than 100 MB. |
| `405 Method Not Allowed` | The request was not a `GET`. |
