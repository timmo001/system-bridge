---
title: Input
---

Simulate keyboard input on the host machine.

## Keyboard keypress

Send the `KEYBOARD_KEYPRESS` event with a `key` to press a single key.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "KEYBOARD_KEYPRESS",
    "data": {
        "key": "a"
    }
}
```

## Keyboard text

Send the `KEYBOARD_TEXT` event with a `text` string to type text.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "KEYBOARD_TEXT",
    "data": {
        "text": "hello"
    }
}
```
