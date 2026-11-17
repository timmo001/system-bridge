---
title: Input
description: Press keys, type text, move and click the mouse, and read or set the clipboard on the machine running System Bridge over the WebSocket API.
---

Simulate keyboard and mouse input on the host machine, or read or put text on its clipboard. See [remote control](/features/remote-control/#how-input-reaches-the-desktop) for how input reaches each desktop.

## Input status

Send the `GET_INPUT_STATUS` event to check whether System Bridge can press keys and move the pointer, and how. It responds with the `INPUT_STATUS` type.

```json title="Request"
{
    "id": "abc123",
    "event": "GET_INPUT_STATUS"
}
```

```json title="Response"
{
    "id": "abc123",
    "type": "INPUT_STATUS",
    "subtype": "NONE",
    "data": {
        "available": true,
        "backend": "wayland",
        "reason": null
    },
    "message": "Input status"
}
```

- `available`: Whether keys and the mouse can be sent.
- `backend`: How they're sent: `wayland`, `libei`, `x11` or `robotgo`. `null` when they can't be.
- `reason`: Why they can't be, or `null`.

On GNOME and KDE, the first check asks the person at the computer to allow remote control, so it can take a while to reply.

## Keyboard keypress

Send the `KEYBOARD_KEYPRESS` event with a `key` to press a single key. It responds with the `KEYBOARD_KEY_PRESSED` type.

```json title="Request"
{
    "id": "abc123",
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

## Mouse

The mouse events act where the pointer is, as a trackpad would. They have no `delay`, and reply as soon as the input is sent.

### Move

Send the `MOUSE_MOVE` event to move the pointer by an amount from where it is. It responds with the `MOUSE_MOVED` type.

```json title="Request"
{
    "id": "abc123",
    "event": "MOUSE_MOVE",
    "data": {
        "x": 40,
        "y": -10
    }
}
```

- `x`: Pixels to move right, or left when negative.
- `y`: Pixels to move down, or up when negative.

Each is capped at 2000 either way.

### Click

Send the `MOUSE_CLICK` event to click a button. It responds with the `MOUSE_CLICKED` type.

```json title="Request"
{
    "id": "abc123",
    "event": "MOUSE_CLICK",
    "data": {
        "button": "left",
        "double": false
    }
}
```

- `button` (optional): `left`, `right` or `middle`. Defaults to `left`.
- `double` (optional): `true` to double-click.

### Hold and release

Send the `MOUSE_BUTTON` event to hold a button down or release it, such as to drag with `MOUSE_MOVE` in between. It responds with the `MOUSE_BUTTON_SET` type.

```json title="Request"
{
    "id": "abc123",
    "event": "MOUSE_BUTTON",
    "data": {
        "button": "left",
        "action": "down"
    }
}
```

- `button` (optional): `left`, `right` or `middle`. Defaults to `left`.
- `action` (required): `down` to hold the button, `up` to release it.

Always release a button you held, or it stays down on the computer.

### Scroll

Send the `MOUSE_SCROLL` event to scroll by mouse wheel notches. It responds with the `MOUSE_SCROLLED` type.

```json title="Request"
{
    "id": "abc123",
    "event": "MOUSE_SCROLL",
    "data": {
        "x": 0,
        "y": -3
    }
}
```

- `x`: Notches to scroll right, or left when negative.
- `y`: Notches to scroll up, or down when negative.

Each is capped at 50 either way.

## Clipboard

Send the `CLIPBOARD_SET_TEXT` event with a `text` string to put it on the clipboard, ready to paste. It responds with the `CLIPBOARD_TEXT_SET` type. Linux only.

```json title="Request"
{
    "id": "abc123",
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
