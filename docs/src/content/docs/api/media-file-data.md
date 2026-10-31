---
title: Media file data
description: Download a media file from the machine running System Bridge over the HTTP API.
---

Download a media file from the machine running System Bridge. The file is returned as-is, so an image request returns the image bytes, an audio request returns the audio, and so on.

## Authentication

Requests are signed with your API token, so the URL can be handed to another device, such as a cast speaker, without sharing the token. A signed URL only reads the one file it was made for, until it expires. A missing, invalid or expired signature returns `401 Unauthorized`. See [how to find your token](/using/cli/#token).

To sign a request, take the HMAC-SHA256 of `base`, `path` and `expires` joined by newlines, keyed with your API token, and hex-encode it:

```text
sig = hex(HMAC-SHA256(key = token, message = base + "\n" + path + "\n" + expires))
```

Sign `base` and `path` as they are, before URL encoding. The Python connector's `media_file_url()` helper builds a signed URL for you.

## Request

```http
GET /api/media/file/data?base={base}&path={path}&expires={expires}&sig={sig}
```

- `base`: the base directory to serve from (see below).
- `path`: the path to the file, relative to `base`.
- `expires`: when the URL stops working, in Unix seconds.
- `sig`: the signature described above.

All four parameters are required.

### Deprecated: token parameter

Passing your API token as `token` in place of `expires` and `sig` still works, but it puts the token in the URL, which can end up on other devices and in their logs. System Bridge logs a warning the first time it's used, and support will be removed in a later release.

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
| `400 Bad Request` | Missing `base` or `path`, an invalid base directory, or the path is not a regular file. |
| `401 Unauthorized` | The signature is missing, invalid or expired, or the deprecated token is incorrect. |
| `403 Forbidden` | The path escapes the base directory, or the file type is not allowed. |
| `404 Not Found` | The file does not exist. |
| `413 Payload Too Large` | The file is larger than 100 MB. |
| `405 Method Not Allowed` | The request was not a `GET`. |
