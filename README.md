
# System Bridge

[![CodeQL](https://github.com/timmo001/system-bridge/actions/workflows/codeql.yml/badge.svg)](https://github.com/timmo001/system-bridge/actions/workflows/codeql.yml)
[![Build](https://github.com/timmo001/system-bridge/actions/workflows/build.yml/badge.svg)](https://github.com/timmo001/system-bridge/actions/workflows/build.yml)
[![Deploy](https://github.com/timmo001/system-bridge/actions/workflows/deploy.yml/badge.svg)](https://github.com/timmo001/system-bridge/actions/workflows/deploy.yml)
[![Lint](https://github.com/timmo001/system-bridge/actions/workflows/lint.yml/badge.svg)](https://github.com/timmo001/system-bridge/actions/workflows/lint.yml)

A bridge for your systems.

![Logo](./resources/system-bridge-rect.png)

## Features:

- System Information: Access your system's information via the data modules using the API/WebSocket.
- Open Files and URLs: Automate your system by opening a URL/path via the API/WebSocket.
- Send Notifications: Send system notifications via the API/WebSocket.
- Compatibility: Works with both Windows and Linux.
- Integration: Seamlessly integrates with [Home Assistant](https://www.home-assistant.io/integrations/system_bridge).
- Android Companion App: Available on the [Play Store](https://play.google.com/store/apps/details?id=dev.timmo.systembridge). The app's source code is available [here](https://github.com/timmo001/system-bridge-android-companion).

## Documentation

### Installation

Find the installation instructions [here](https://system-bridge.timmo.dev/docs/install).

### Running

Instructions to run the application are available [here](https://system-bridge.timmo.dev/docs/running).

### Data Modules

Documentation for data modules accessible via the API/WebSocket can be found [here](https://system-bridge.timmo.dev/#modules).

### CLI

CLI documentation is available [here](https://system-bridge.timmo.dev/docs/cli).

### API

API documentation can be accessed [here](https://system-bridge.timmo.dev/docs/api/data).

### WebSocket

WebSocket documentation is located [here](https://system-bridge.timmo.dev/docs/websocket/data-get).

## Packages

### `systembridgebackend`

This is the primary application containing the API/WebSocket and data modules. It depends on the `systembridgeshared` package.

### `systembridgecli`

Command line interface for the application. Allows users to fetch the `api-key`, update settings, and retrieve data.

### `systembridgeconnector`

Facilitates other applications to connect to the backend, like the [Home Assistant](https://www.home-assistant.io/integrations/system_bridge) integration.

### `systembridgefrontend`

Application frontend, used by the `systembridgegui` module for settings display and more.

### `systembridgegui`

Application GUI showcasing a system tray icon, enabling user interaction with the application.

### `systembridgeshared`

A shared package utilized by the `systembridgebackend`, `systembridgecli`, and `systembridgegui` packages.

### `systembridgewindowssensors`

Tailored for Windows, this package introduces sensors to fetch system information.

## Developing

For Python module installation:

```bash
python -m pip install .
```

Execute this in each directory containing a `setup.py` file.

For installing all current dev releases:

```bash
python -m pip install --upgrade --pre systembridgeshared systembridgebackend systembridgecli systembridgeconnector systembridgefrontend systembridgegui systembridgewindowssensors
```

### Frontend Development

Navigate to the `frontend` directory and install the dependencies:

```bash
cd frontend
yarn install
```

To start the development server:

```bash
yarn start:dev
```

After development, build and export the frontend. Then install the Python package:

```bash
yarn build
yarn export
python -m pip install .
```

### Windows Sensors Development

Open the .NET solution in the `windowssensors` directory, make your modifications, and build the solution.

To install the package:

```bash
python -m pip install .
```
