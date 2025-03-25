# System Bridge

A bridge for your systems.

## Setup

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

Allows other applications to connect to the backend. For example, in the [Home Assistant](https://www.home-assistant.io/integrations/system_bridge) integration.
