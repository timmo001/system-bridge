# System Bridge

A bridge for your systems.

![CI](https://github.com/timmo001/system-bridge/workflows/CI/badge.svg) ![CodeQL](https://github.com/timmo001/system-bridge/workflows/CodeQL/badge.svg)

![Logo](./public/system-bridge-rect.png)

## Features

- Cross-Platform (Supported on Windows, Linux and Mac OS)
- API
- Websocket
- Built using Electron
- TBD

### API Endpoints

| endpoint     | Description           |
| ------------ | ----------------------|
| /audio       | Audio Information     |
| /battery     | Battery Information   |
| /bluetooth   | Bluetooth Information |
| /command     | Run a System Command  |
| /cpu         | CPU Information       |
| /docs        | OpenAPI Docs          |
| /filesystem  | Filesystem Information|
| /graphics    | Graphics Information  |
| /information | Endpoint Information  |
| /memory      | Memory Information    |
| /network     | Network Information   |
| /os          | OS Information        |
| /processes   | Processes Information |
| /system      | System Information    |

## Download

You can download the latest version of the application [here](https://github.com/timmo001/system-bridge/releases).

## Updates

The application will automatically update whenever a new version is released in
this repository.

## Developing

### Dependencies

To make changes to the application, you will need:

- Node.js
- Yarn

### Optional Dependencies

#### MDNS

You will only need this if you want to be able to discover the app over mdns.
The app will warn you if there are missing dependencies.

##### MDNS - Windows

You will need the "Bonjour SDK for Windows" or a related SDK in your system.

> This is not used when building the app, as linux builds using the avahi
> libdns_sd package with wine. See the GitHub workflows for details.

##### MDNS - Linux

###### Ubuntu/Debian/APT

```bash
sudo apt install libavahi-compat-libdnssd-dev
```

###### Fedora/DNF/RPM

```bash
sudo dnf install avahi-compat-libdns_sd-devel
```

### Setup

```bash
yarn install:all
```

### Running

```bash
yarn start:dev
```

or:

```bash
yarn start
```

### Package / Make

```bash
yarn [package|make]
```

or if developing for another platform:

```bash
yarn [package|make] --platform [darwin|linux|win32]
```

## Publishing

> Make sure the version in `package.json` matches the release before publishing.

1. Find the draft release created by the release drafter workflow.
1. Publish the release.

The deploy workflow will then publish the release for each platform.

