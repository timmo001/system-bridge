---
title: Releases
description: Get the newest System Bridge releases and their notes, marked against the computer's version.
---

Get the newest stable System Bridge releases, with their release notes, marked against the version the computer runs. The web client's [What's new](/using/web-client#whats-new) page uses it.

Needs the API token, as `X-API-Token`, the `token` header or `Authorization: Bearer`.

## Request

```http
GET /api/releases
X-API-Token: {token}
```

## Response

```json title="Response"
{
  "version": "5.28.4",
  "releases": [
    {
      "version": "5.28.5",
      "name": "5.28.5",
      "publishedAt": "2026-11-10T12:30:17Z",
      "url": "https://github.com/timmo001/system-bridge/releases/tag/5.28.5",
      "notes": "Lets a Home Assistant dashboard section show several sections…",
      "newer": true,
      "installed": false
    }
  ],
  "more": "https://github.com/timmo001/system-bridge/releases"
}
```

| Field | Description |
| --- | --- |
| `version` | The version the computer runs, as the `system` module reports it. |
| `releases` | Up to the 10 newest stable releases, newest first. Drafts and prereleases are left out. |
| `releases[].notes` | The release notes, in Markdown. |
| `releases[].newer` | Whether the release is newer than the computer's version. A development build counts the release it was built after as not newer. |
| `releases[].installed` | Whether the computer runs this release. Development builds never do. |
| `more` | The page listing every release. |

System Bridge gets the list from GitHub and keeps it for 6 hours. If GitHub can't be reached, it answers with the last list it had, or `502` without one. See [Privacy](/privacy#update-check).
