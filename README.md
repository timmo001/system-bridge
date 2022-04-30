# System Bridge

![CI](https://github.com/timmo001/system-bridge/workflows/CI/badge.svg) ![CodeQL](https://github.com/timmo001/system-bridge/workflows/CodeQL/badge.svg)

A bridge for your systems.

![Logo](./resources/system-bridge-rect.png)

## Features

- System Information - Access your system's Audio, Battery, Bluetooth, CPU, Disks, GPU, Keyboard, Memory and System information via the API.
- Open files and URLs - Automate your system by opening a URL/path via the API.
- Send Notifications - Send system notifications via the API.
- Cross-Platform - Compatible with Windows and Linux.
- Integrated with
 [Home Assistant](https://www.home-assistant.io/integrations/system_bridge) -
 Interact with your Bridges using Home Assistant.

## Android Companion App

You can find the Android companion app on the
[Play Store](https://play.google.com/store/apps/details?id=dev.timmo.systembridge).
The source for this app can be found on
[GitHub](https://github.com/timmo001/system-bridge-android-companion).

## API Endpoints

You can find documentation for the API [here](https://system-bridge.timmo.dev/docs/api).

## Installation

You can install all applications using pip:

```bash
pip install --upgrade systembridgeshared systembridgebackend systembridgecli systembridgefrontend systembridgegui
```

Not all packages are required. For just the base application without the GUI, you can remove the `systembridgegui` package from the above command. This is useful for running the application on a server.

### Windows

In windows there is an optional but recommended package which provides sensor data specific to Windows. You can install it using the following command:

```bash
pip install --upgrade systembridgewindowssensors
```

## Running

To run the application, you can use the following command:

```bash
python -m systembridgebackend
```

### CLI

To run the CLI, you can use the following command:

```bash
python -m systembridgecli --help
```

This command will show you all available commands.

#### Getting the api-key

To get the api-key, you can use the following command:

```bash
python -m systembridgecli api-key
```

You can reset your api-key by using the following command:

```bash
python -m systembridgecli api-key --reset
```

## Packages

### `systembridgebackend`

The main application which contains the API/WebSocket and data modules.

### `systembridgecli`

The command line interface for the application. Here you can get the api-key and update settings and get data.

### `systembridgeconnector`

Allows other applications to connect to the backend. For example, in the [Home Assistant](https://www.home-assistant.io/integrations/system_bridge) integration.

### `systembridgefrontend`

The frontend for the application. This is used by the `systembridgegui` module to show settings etc.

### `systembridgegui`

The GUI for the application. This shows a system tray icon and allows you to interact with the application.

### `systembridgeshared`

Shared package required by the `systembridgebackend`, `systembridgecli` and `systembridgegui` packages.

## Developing

You can install each python module using pip:

```bash
pip install .
```

inside each directory with a setup.py file.

You can also install all current dev releases using the following command:

```bash
pip install --upgrade --pre systembridgeshared systembridgebackend systembridgecli systembridgeconnector systembridgefrontend systembridgegui systembridgewindowssensors
```

## Publishing

> Make sure the version in `package.json` matches the release before publishing.

1. Find the draft release created by the release drafter workflow.
1. Publish the release.

The deploy workflow will then publish the release for each platform.

[buymeacoffee-shield]: https://www.buymeacoffee.com/assets/img/guidelines/download-assets-sm-2.svg
[buymeacoffee]: https://www.buymeacoffee.com/timmo
[sponsor-badge]: https://raw.githubusercontent.com/timmo001/home-panel/master/documentation/resources/sponsor.png
[sponsor]: https://github.com/sponsors/timmo001?o=esc

## Links

- [Website](https://system-bridge.timmo.dev)

## Support my work

If you like my work, and would like to send me a tip/donation, please use the
links below:

[![Sponsor Timmo][sponsor-badge]][sponsor]

[![Buy me a coffee][buymeacoffee-shield]][buymeacoffee]
