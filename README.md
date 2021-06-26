# System Bridge

![CI](https://github.com/timmo001/system-bridge/workflows/CI/badge.svg) ![CodeQL](https://github.com/timmo001/system-bridge/workflows/CodeQL/badge.svg)

A bridge for your systems.

![Logo](./public/system-bridge-rect.png)

## Features

- System Information - Access your system's Audio, Battery, Bluetooth, CPU,
 Filesystems, Graphics, Memory, Networking, OS, and Process information via the
 API.
- Audio Player and Controls - Play music or sounds and change the volume of
 your device via the API.
- Video Player - Play local or hosted videos on your device via the API.
- Send Commands - Automate your system by sending a command or opening a URL or
 path via the API.
- Cross-Platform - Compatible with Windows, Mac and Linux.

### API Endpoints

You can find documentation for the API [here](https://system-bridge.timmo.dev/docs/api).

## Download

You can download the latest version of the application [here](https://github.com/timmo001/system-bridge/releases).

## Updates

The application will automatically update whenever a new version is released in
this repository. You can also download the latest version manually from [here](https://github.com/timmo001/system-bridge/releases).

## Support my work

If you like my work, and would like to send me a tip/donation, please use the
links below:

[![Sponsor Timmo][sponsor-badge]][sponsor]

[![Buy me a coffee][buymeacoffee-shield]][buymeacoffee]

## Links

- [Website](https://system-bridge.timmo.dev)
- [API](https://github.com/timmo001/system-bridge-api)
- [Frontend](https://github.com/timmo001/system-bridge-frontend)

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

##### MDNS - Linux

###### Ubuntu/Debian/APT

```bash
sudo apt install \
    libavahi-compat-libdnssd-dev \
    libpng++-dev \
    libxext-dev \
    libxss-dev \
    libxtst-dev
```

###### Fedora/DNF/RPM

```bash
sudo dnf install \
    avahi-compat-libdns_sd-devel
    libpng-devel \
    libxext-devel \
    libxss-devel \
    libxtst-devel
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

## Publishing

> Make sure the version in `package.json` matches the release before publishing.

1. Find the draft release created by the release drafter workflow.
1. Publish the release.

The deploy workflow will then publish the release for each platform.

[buymeacoffee-shield]: https://www.buymeacoffee.com/assets/img/guidelines/download-assets-sm-2.svg
[buymeacoffee]: https://www.buymeacoffee.com/timmo
[sponsor-badge]: https://raw.githubusercontent.com/timmo001/home-panel/master/documentation/resources/sponsor.png
[sponsor]: https://github.com/sponsors/timmo001?o=esc
