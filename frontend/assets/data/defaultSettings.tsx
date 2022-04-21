import {
  mdiAccessPoint,
  mdiAccount,
  mdiKey,
  mdiLock,
  mdiProtocol,
  mdiRocketLaunch,
  mdiTimerOutline,
} from "@mdi/js";

import { Configuration } from "../entities/configuration.entity";

export const defaultConfiguration: Configuration = {
  general: {
    name: "General",
    items: {
      launchOnStartup: {
        name: "Launch on Startup",
        description: "Start the application on startup.",
        defaultValue: false,
        value: null,
        icon: mdiRocketLaunch,
        containerDisabled: true,
      },
    },
  },
  network: {
    name: "Network",
    description: "API and WebSocket specific settings.",
    items: {
      apiPort: {
        name: "API Port",
        description: "The port the application's API runs on.",
        defaultValue: 9170,
        value: null,
        icon: mdiProtocol,
        minimum: 1,
        requiresServerRestart: true,
        containerDisabled: true,
      },
      apiKey: {
        name: "API Key",
        description: "The API key to authenticate with the API.",
        defaultValue: "",
        value: null,
        icon: mdiKey,
        requiresServerRestart: true,
      },
    },
  },
  mqtt: {
    name: "MQTT",
    description: "MQTT specific settings.",
    items: {
      enabled: {
        name: "MQTT Enabled",
        description: "Should MQTT be enabled?",
        defaultValue: false,
        value: null,
        icon: mdiAccessPoint,
        requiresServerRestart: true,
      },
      host: {
        name: "Broker Host",
        description: "The host of your MQTT broker.",
        defaultValue: "localhost",
        value: null,
        icon: mdiAccessPoint,
        requiresServerRestart: true,
      },
      port: {
        name: "Broker Port",
        description: "The port of your MQTT broker.",
        defaultValue: 1883,
        value: null,
        icon: mdiProtocol,
        minimum: 1,
        requiresServerRestart: true,
      },
      username: {
        name: "Broker Username",
        description: "The username of your MQTT broker.",
        defaultValue: "",
        value: null,
        icon: mdiAccount,
        requiresServerRestart: true,
      },
      password: {
        name: "Broker Password",
        description: "The password of your MQTT broker.",
        defaultValue: "",
        value: null,
        icon: mdiLock,
        isPassword: true,
        requiresServerRestart: true,
      },
    },
  },
  observer: {
    name: "Observer",
    description: "Observer specific settings.",
    items: {
      interval: {
        name: "Observer Interval (ms)",
        description:
          "The amount of time in milliseconds the observer will wait before checking for new data. The faster, the more updates, but also the more system utilization.",
        defaultValue: 60000,
        value: null,
        minimum: 20000,
        icon: mdiTimerOutline,
        requiresServerRestart: true,
      },
    },
  },
};
