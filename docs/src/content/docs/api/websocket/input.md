---
title: Input
---

Simulate keyboard input on the host machine.

## Keyboard keypress

Send the `KEYBOARD_KEYPRESS` event with a `key` to press a single key. It responds with the `KEYBOARD_KEY_PRESSED` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "KEYBOARD_KEYPRESS",
    "data": {
        "key": "a",
        "modifiers": ["ctrl", "shift"],
        "delay": 100
    }
}
```

Available fields:

- `key` (required): The key to press.
- `modifiers` (optional): Modifier keys to hold while pressing `key`. Recognised values are `shift`, `ctrl` (or `control`), `alt`, and `cmd` (or `command`). Unrecognised modifiers are ignored.
- `delay` (optional): Time to wait before pressing the key, in milliseconds.

For example, to send Ctrl+C, set `key` to `c` and `modifiers` to `["ctrl"]`.

## Keyboard text

Send the `KEYBOARD_TEXT` event with a `text` string to type text. It responds with the `KEYBOARD_TEXT_SENT` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "KEYBOARD_TEXT",
    "data": {
        "text": "hello",
        "delay": 100
    }
}
```

Available fields:

- `text` (required): The text to type.
- `delay` (optional): Time to wait before typing, in milliseconds.
