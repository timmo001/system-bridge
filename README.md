# System Bridge

A bridge for your systems.

![Logo](./resources/system-bridge-rect.png)

## Features

- System Information - Access your system's information via the data modules using the API/WebSocket.
- Open files and URLs - Automate your system by opening a URL/path via the API/WebSocket.
- Send Notifications - Send system notifications via the API/WebSocket.
- Compatible with Windows and Linux.
- Integrated with [Home Assistant](https://www.home-assistant.io/integrations/system_bridge).
- Android Companion App - You can find the Android companion app on the [Play Store](https://play.google.com/store/apps/details?id=dev.timmo.systembridge). The source for this app can be found [here](https://github.com/timmo001/system-bridge-android-companion).

## Installation

You can find installation instructions [here](https://system-bridge.timmo.dev/docs/install).

## Running

You can find instructions to run the application [here](https://system-bridge.timmo.dev/docs/running).

## Data Modules

You can find documentation data modules that can be accessed via the API/WebSocket [here](https://system-bridge.timmo.dev/#modules).

## CLI

You can find documentation for the CLI [here](https://system-bridge.timmo.dev/docs/cli).

## API

You can find documentation for the API [here](https://system-bridge.timmo.dev/docs/api/data).

## WebSocket

You can find documentation for the WebSocket [here](https://system-bridge.timmo.dev/docs/websocket/data-get).

## Packages

### [Backend](https://github.com/timmo001/system-bridge-backend)

The main application which contains the API/WebSocket and data modules. This package requires the `systembridgeshared` package.

### [CLI](https://github.com/timmo001/system-bridge-cli)

The command line interface for the application. Here you can get the `token` and update settings and get data.

### [Connector](https://github.com/timmo001/system-bridge-connector)

Allows other applications to connect to the backend. For example, in the [Home Assistant](https://www.home-assistant.io/integrations/system_bridge) integration.

### [Frontend](https://github.com/timmo001/system-bridge-frontend)

The frontend for the application.

### [Shared](https://github.com/timmo001/system-bridge-shared)

Shared package required by the `systembridgebackend` and `systembridgecli` packages.

### [Models](https://github.com/timmo001/system-bridge-models)

Shared package used by most of the other packages containing the models used by the application.

### [Windows Sensors](https://github.com/timmo001/system-bridge-windows-sensors)

Specifically for windows, adds sensors to get windows system information.

## Application Development

### Prerequisites

- [Python 3.12](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/en/download/)
- [Yarn](https://yarnpkg.com/getting-started/install)

### Setup

#### Windows


```powershell
.\setup.ps1
```

#### Linux


```bash
./setup.sh
```

## Module Development

### Windows

#### Clone

```powershell
Write-Host "Make sure you have winget, GitHub CLI, Git and Python 3.12 installed before running this script!"
Read-Host -Prompt "Press Enter to continue"

Write-Output "Upgrading GitHub CLI..."
winget upgrade GitHub.CLI

Write-Output "Upgrading Git..."
winget upgrade Git.Git

Write-Output "Upgrading Python 3.12..."
winget upgrade Python.Python.3.12

Write-Output "Clone repositories..."
gh repo clone timmo001/system-bridge package
gh repo clone timmo001/system-bridge-backend backend
gh repo clone timmo001/system-bridge-cli cli
gh repo clone timmo001/system-bridge-connector connector
gh repo clone timmo001/system-bridge-frontend frontend
gh repo clone timmo001/system-bridge-shared shared
gh repo clone timmo001/system-bridge-models models
gh repo clone timmo001/system-bridge-windows-sensors windows-sensors

Write-Output "Clone complete!"
```

#### Build

```powershell
Write-Host "Make sure you have ran clone.ps1 and have winget, Git and Python 3.12 installed before running this script!"
Read-Host -Prompt "Press Enter to continue"

Write-Output "Upgrading Python 3.12..."
winget upgrade Python.Python.3.12

Write-Output "Update pip, setuptools and wheel..."
python -m pip install --upgrade pip setuptools wheel

Write-Output "Uninstall any existing packages..."
python -m pip uninstall systembridge -y
python -m pip uninstall systembridgebackend -y
python -m pip uninstall systembridgecli -y
python -m pip uninstall systembridgeconnector -y
python -m pip uninstall systembridgefrontend -y
python -m pip uninstall systembridgeshared -y
python -m pip uninstall systembridgemodels -y
python -m pip uninstall systembridgewindowssensors -y

Write-Output "Install packages..."

Write-Output "Install models.."
Set-Location models && git pull && python -m pip install . && Set-Location ..

Write-Output "Install shared.."
Set-Location shared && git pull && python -m pip install . && Set-Location ..

Write-Output "Install connector.."
Set-Location connector && git pull && python -m pip install . && Set-Location ..

Write-Output "Install frontend.."
Set-Location frontend && git pull && yarn install && yarn build && python -m pip install . && Set-Location ..

Write-Output "Install cli.."
Set-Location cli && git pull && python -m pip install . && Set-Location ..

Write-Output "Install backend.."
Set-Location backend && git pull && python -m pip install . && Set-Location ..

Write-Output "This next step requires you to build the windows-sensors/WindowsSensors/WindowsSensors.sln solution in Visual Studio."
Read-Host -Prompt "Press Enter to continue"
Write-Output "Install windows-sensors.."
Set-Location windows-sensors && git pull && python -m pip install . && Set-Location ..

Write-Output "Install complete!"
```
