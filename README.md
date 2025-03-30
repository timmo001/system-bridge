# System Bridge

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

<!-- TODO: Add installation instructions. -->

TODO

## Running

<!-- TODO: Add running instructions. -->

TODO

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
