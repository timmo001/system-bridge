---
title: Input
description: Press keys, type text and read or set the clipboard on the machine running System Bridge over the WebSocket API.
---

Simulate keyboard input on the host machine, or read or put text on its clipboard.

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

## Clipboard

Send the `CLIPBOARD_SET_TEXT` event with a `text` string to put it on the clipboard, ready to paste. It responds with the `CLIPBOARD_TEXT_SET` type. Linux only.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "CLIPBOARD_SET_TEXT",
    "data": {
        "text": "hello"
    }
}
```

It uses `wl-copy` from wl-clipboard on Wayland, or `xclip` or `xsel` on X11, so one of those needs to be installed.

Send the `CLIPBOARD_GET_TEXT` event to read the clipboard's text. It responds with the `CLIPBOARD_TEXT` type, with an empty `text` when nothing has been copied. It works on Linux, with `wl-paste` or `xclip` or `xsel`, on Windows and on macOS.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "CLIPBOARD_GET_TEXT"
}
```

```json title="Response"
{
    "id": "abc123",
    "type": "CLIPBOARD_TEXT",
    "subtype": "NONE",
    "data": {
        "text": "hello"
    },
    "message": "Got clipboard"
}
```
