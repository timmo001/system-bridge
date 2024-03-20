import { ReactElement, useCallback, useEffect, useState } from "react";
import { CircularProgress, Grid, TextField, useTheme } from "@mui/material";
import { useRouter } from "next/router";
import {
  mdiFolderMultipleOutline,
  mdiKeyboardOutline,
  mdiProtocol,
  mdiRocketLaunch,
  mdiTextBoxOutline,
} from "@mdi/js";

import { SettingDirectory, SettingHotkey, type Settings } from "types/settings";
import { type WebSocketResponse } from "types/websocket";
import { useSettings } from "components/Contexts/Settings";
import { WebSocketConnection } from "components/Common/WebSocket";
import Section from "components/Settings/Section";
import Item from "components/Settings/Item";

let ws: WebSocketConnection;

export interface SettingDescription {
  name: string;
  description: string;
  icon: string;
  containerDisabled?: boolean;
  isList?: boolean;
  isPassword?: boolean;
  minimum?: number;
}

export const settingsMap: { [key: string]: SettingDescription } = {
  api_port: {
    name: "API Port",
    description: "Port for the API and WebSocket",
    icon: mdiProtocol,
  },
  api_token: {
    name: "API Token",
    description: "Token for the API and WebSocket",
    icon: mdiTextBoxOutline,
  },
  autostart: {
    name: "Autostart",
    description: "Automatically start the application on startup",
    icon: mdiRocketLaunch,
  },
  log_level: {
    name: "Log Level",
    description: "Log level for the application",
    icon: mdiTextBoxOutline,
  },
  directories: {
    name: "Additional Media Directories",
    description: "Additional media directories for the media endpoint",
    icon: mdiFolderMultipleOutline,
    isList: true,
  },
  keyboard_hotkeys: {
    name: "Keyboard Hotkeys",
    description: "Setup hotkeys for triggering actions",
    icon: mdiKeyboardOutline,
    isList: true,
  },
};

function Settings(): ReactElement {
  const [settings, setSettings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);

  const query = useRouter().query;

  const eventHandler = useCallback(
    (event: WebSocketResponse) => {
      console.log("New event:", event);
      if (event.type === "SETTINGS_RESULT") {
        setSettings(event.data as Settings);
      }
    },
    [setSettings]
  );

  const handleSetup = useCallback(
    (port: number, token: string) => {
      console.log("Setup WebSocketConnection");
      ws = new WebSocketConnection(port, token, async () => {
        ws.getSettings();
      });
      ws.onEvent = (e: Event) => eventHandler(e as WebSocketResponse);
    },
    [eventHandler]
  );

  const handleChanged = useCallback(
    (newSettings: Settings) => {
      ws.updateSettings(newSettings);
      setSettings(settings);
    },
    [settings, setSettings]
  );

  useEffect(() => {
    if (!setup && query && query.token) {
      setSetup(true);
      handleSetup(Number(query.apiPort) || 9170, String(query.token));
    }
  }, [setup, handleSetup, query]);

  const theme = useTheme();

  return (
    <>
      <Grid
        container
        direction="column"
        spacing={2}
        alignItems="stretch"
        sx={{
          marginBottom: theme.spacing(8),
          padding: theme.spacing(2),
        }}
      >
        {settings ? (
          <>
            <Section name="API" description="API settings">
              <Item
                keyIn="api_port"
                valueIn={settings.api.port}
                handleChanged={(value: number) =>
                  handleChanged({
                    ...settings,
                    api: { ...settings.api, port: value },
                  })
                }
              />
              {/* <Item
              keyIn="api_token"
              valueIn={settings.api.token}
              handleChanged={(value: string) =>
                handleChanged({
                  ...settings,
                  api: { ...settings.api, token: value },
                })
              }
            /> */}
            </Section>
            <Section name="General" description="General settings">
              <Item
                keyIn="autostart"
                valueIn={settings.autostart}
                handleChanged={(value: boolean) =>
                  handleChanged({
                    ...settings,
                    autostart: value,
                  })
                }
              />
              <Item
                keyIn="log_level"
                valueIn={settings.log_level}
                handleChanged={(value: string) =>
                  handleChanged({
                    ...settings,
                    log_level: value,
                  })
                }
              />
            </Section>
            <Section name="Keyboard" description="Keyboard settings">
              <Item
                keyIn="keyboard_hotkeys"
                valueIn={settings.keyboard_hotkeys}
                handleChanged={(value: Array<SettingHotkey>) =>
                  handleChanged({
                    ...settings,
                    keyboard_hotkeys: value,
                  })
                }
              />
            </Section>
            <Section name="Media" description="Media settings">
              <Item
                keyIn="directories"
                valueIn={settings.media.directories}
                handleChanged={(value: Array<SettingDirectory>) =>
                  handleChanged({
                    ...settings,
                    media: {
                      ...settings.media,
                      directories: value,
                    },
                  })
                }
              />
            </Section>
          </>
        ) : (
          <Grid
            container
            direction="row"
            justifyContent="center"
            sx={{ margin: theme.spacing(2, 0, 10) }}
          >
            <CircularProgress />
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default Settings;
