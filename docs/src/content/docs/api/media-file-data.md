---
title: Media file data
description: Download a media file from the machine running System Bridge over the HTTP API.
---

Download a media file from the machine running System Bridge. The file is returned as-is, so an image request returns the image bytes, an audio request returns the audio, and so on.

## Authentication

Media file URLs hold no key. Ask System Bridge to sign one for a file, and the URL can be handed to another device, such as a cast speaker, without sharing your key. A signed URL only reads the one file it was made for, until it expires. A missing, invalid or expired signature returns `401 Unauthorized`.

### Get a signed URL

Needs a [key](/api/#authentication), as `Authorization: Bearer`.

```http
POST /api/media/file/url
Authorization: Bearer {key}
Content-Type: application/json

{ "base": "music", "path": "albums/song.mp3", "expiresIn": 3600 }
```

```json title="Response"
{
  "url": "/api/media/file/data?base=music&expires=1794771735&path=albums%2Fsong.mp3&sig=…",
  "expires": 1794771735
}
```

`expiresIn` is in seconds, and 24 hours at most, which is also what you get without it. `url` is relative to System Bridge's address. URLs are signed with a secret made each time System Bridge starts, so they stop working when it restarts too. The Python connector's `HTTPClient.media_file_url()` asks for one for you.

## Request

```http
GET /api/media/file/data?base={base}&path={path}&expires={expires}&sig={sig}
```

- `base`: the base directory to serve from (see below).
- `path`: the path to the file, relative to `base`.
- `expires`: when the URL stops working, in Unix seconds.
- `sig`: the signature.

All four parameters are required.

### Deprecated: the API token

Until the shared API token is removed in a later release, two older ways still work. A URL signed by the client with the token, as the HMAC-SHA256 of `base`, `path` and `expires` joined by newlines, keyed with the token. And the token itself as `token`, in place of `expires` and `sig`, which puts it in the URL, where it can end up on other devices and in their logs. System Bridge logs a warning the first time that's used.

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
| `401 Unauthorized` | The signature is missing, invalid or expired, or the deprecated token is wrong. |
| `403 Forbidden` | The path escapes the base directory, or the file type is not allowed. |
| `404 Not Found` | The file does not exist. |
| `413 Payload Too Large` | The file is larger than 100 MB. |
| `405 Method Not Allowed` | The request was not a `GET`. |
