# System Bridge

> [!NOTE]
> This project is currently going through a [rebuild in go](https://github.com/timmo001/system-bridge/issues/3392).
> If you would like to try the new version, you should use the latest build output from the GitHub actions. If you are an Arch Linux user you can use the latest [AUR build](#arch-linux-1).

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

## System Requirements

<!-- TODO: Remove when 5.0.0 is released -->

> [!WARNING]
> The following documentation is for version 5.0.0 and
> above which is currently in development.

### Linux

#### Arch Linux

Install the following packages:

```zsh
sudo pacman -S inetutils wlr-randr
```

#### Debian/Ubuntu (Not verified)

Install the following packages:

```zsh
sudo apt install inetutils-tools wlr-randr
```

#### Fedora (Not verified)

Install the following packages:

```zsh
sudo dnf install inetutils wlr-randr
```

## Installation

Download the latest release from the [releases page](https://github.com/timmo001/system-bridge/releases).

### Linux installation

Install the package for your distribution's package manager.

#### Arch Linux

You can install the current master branch of this project with the AUR package [system-bridge-git](https://aur.archlinux.org/packages/system-bridge-git). This will build and install the application for you based on the latest master branch which is automatically updated every commit.

### Windows installation

Run the setup executable to install the application.

## Running

<!-- TODO: Remove when 5.0.0 is released -->

> [!WARNING]
> The following documentation is for version 5.0.0 and
> above which is currently in development.

1. To run the backend server:

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
1. Run `go build`
1. Run `go install`

## Packages

### [Connector](https://github.com/timmo001/system-bridge-connector)

Allows other applications to connect to the backend. For example, in the
[Home Assistant](https://www.home-assistant.io/integrations/system_bridge)
integration.
