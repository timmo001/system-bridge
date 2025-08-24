# System Bridge

> [!IMPORTANT]
> Any version 4 users will need to remove any integrations, and uninstall the
> old application before installing v5 to avoid conflicts. Your token and
> settings will not carry over to the new version.

A bridge for your systems.

> [!NOTE]
> Contributions welcome!
> Feel free to submit a PR if you have any changes, fixes or improvements.

## Features

- Supports Linux and Windows. MacOS is untested but can be compiled and tested by
  the community.
- Access your system information via data modules and the API/WebSocket server.
- Control your system via the API/WebSocket server.
- Integrated with [Home Assistant](https://www.home-assistant.io/integrations/system_bridge)

## Installation

Download the latest release from the [releases page](https://github.com/timmo001/system-bridge/releases).

### Linux installation

Install the package for your distribution's package manager.

#### Arch Linux (AUR)

You can install the latest version with the aur package [system-bridge](https://aur.archlinux.org/packages/system-bridge).

You can also install the current master branch of this project with the AUR package
[system-bridge-git](https://aur.archlinux.org/packages/system-bridge-git).
This will build and install the application for you based on the latest master
branch which is automatically updated every commit.

### Windows installation

Run the setup executable to install the application.

## Running

1. To run the backend server use the desktop shortcut which will launch the
    application for you. If you are a linux user, you can also launch the
    app via the terminal:

   ```bash
   system-bridge backend
   ```

### Running as a Service

#### Linux (systemd)

> [!WARNING]
> Not supported with AppImage or Flatpak.
> You will need to configure the service
> manually to the correct path.

1. Copy the systemd service file to the systemd directory:

   ```bash
   sudo cp .scripts/linux/system-bridge.service /etc/systemd/system/
   ```

2. Reload systemd daemon:

   ```bash
   sudo systemctl daemon-reload
   ```

3. Enable the service to start on boot:

   ```bash
   sudo systemctl enable system-bridge
   ```

4. Start the service:

   ```bash
   sudo systemctl start system-bridge
   ```

5. Check the service status:

   ```bash
   sudo systemctl status system-bridge
   ```

#### Windows (service installation)

1. Open PowerShell as Administrator
2. Navigate to the directory containing the installation scripts
3. Run the installation script:

   ```powershell
   .\scripts\windows\install-service.ps1
   ```

4. To uninstall the service:

   ```powershell
   .\scripts\windows\uninstall-service.ps1
   ```

## Development Setup

1. Install go
1. Set up your go workspace and make sure that your `GOPATH` is set correctly.

```zsh
export GOPATH=$HOME/go
export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin
```

## Build and Install

1. Clone this repo
1. Run `make build`

## Packages

### [Connector](https://github.com/timmo001/system-bridge-connector)

Allows other applications to connect to the backend. For example, in the
[Home Assistant](https://www.home-assistant.io/integrations/system_bridge)
integration.
