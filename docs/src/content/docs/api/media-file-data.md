---
title: Media - Get File Data
---

_Get media file from system._

## Request

```http
GET /api/media/file/data?base={base}&path={path}&token={token}
```

Base is the base directory to search from. Path is the relative path to the file from the base.

The available base directories are:

- documents
- downloads
- home
- music
- pictures
- videos

## Response

This will be the binary version of the file you request, so an image will return the image etc.
