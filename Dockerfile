ARG BUILD_FROM=ghcr.io/timmo001/container-debian-base/amd64:stable
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Copy root filesystem
COPY rootfs /

# Copy package
COPY *.deb /tmp

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG BUILD_ARCH=amd64

# Install system
# hadolint ignore=DL3003,DL3018
RUN \
    apt-get update \
    \
    && apt-get install -y /tmp/*.deb \
    \
    && rm -f /usr/local/share/system-bridge/*.ico \
    && rm -f /usr/local/share/system-bridge/*.png \
    && rm -f /usr/local/share/system-bridge/system-bridge-tray \
    && rm -f /usr/local/share/system-bridge/xdg-open \
    && rm -f /usr/share/applications/system-bridge.desktop \
    && rm -fr /usr/local/share/system-bridge/traybin \
    \
    && mkdir -p /root/.local/share/system-bridge \
    \
    && rm -fr \
        /tmp/* \
        /var/{cache,log}/* \
        /var/lib/apt/lists/*

# Build arguments
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# Labels
LABEL \
    maintainer="Aidan Timson <contact@timmo.xyz>" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.vendor="Timmo" \
    org.opencontainers.image.authors="Aidan Timson <contact@timmo.xyz>" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://timmo.dev" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.documentation="https://github.com/${BUILD_REPOSITORY}/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION}
