---
title: Status & Health
---

These endpoints report whether the backend is running. Neither requires authentication.

## Status

```http
GET /api
```

Returns a JSON object confirming the API is running:

```json title="Response"
{
    "status": "success",
    "message": "API is running",
    "data": {}
}
```

## Health

```http
GET /api/health
```

Returns the health status, current time and backend version:

```json title="Response"
{
    "status": "healthy",
    "timestamp": "2025-01-01T12:00:00Z",
    "version": "5.0.0"
}
```
