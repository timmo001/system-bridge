---
title: TUI
description: Control System Bridge from an interactive terminal interface.
---

The TUI is an interactive terminal interface for System Bridge. It wraps the [CLI](/using/cli/) commands in a searchable, keyboard-driven menu.

:::note
The TUI needs an interactive terminal, so everything on this page assumes you are running it in one. Running `system-bridge` on its own launches the TUI when the terminal is interactive. In a non-interactive context, such as a script or when input is piped, the bare command prints help instead.
:::

## Launching the TUI

```bash
system-bridge tui
```

You can also use the short alias:

```bash
system-bridge t
```

## Navigating

- Use the arrow keys to move through the menu and `Enter` to select an item.
- Start typing to fuzzy-search the menu by title, description, or keyword.
- Vim-style commands work too, such as `:q` to quit.

## Menu

### Backend

Start the backend server. A variant lets you start the backend and open the [web client](/using/web-client/) in your browser at the same time.

### Client

Run client commands:

- **Token**: print your API token.
- **Notification**: send a notification using a form for the title, message, and icon. Advanced fields cover the sound, action URL, and action path.
- **Discovery**: list System Bridge services discovered on your network.
- **Data**: list the available data modules, or run a module and print its output. Running a module lets you pick the module and pretty-print the JSON.

### Version

Show the application version.

### Quit

Exit the TUI.

## Next steps

- See the [CLI](/using/cli/) for the underlying commands and flags.
- Prefer a browser? Use the [web client](/using/web-client/).
