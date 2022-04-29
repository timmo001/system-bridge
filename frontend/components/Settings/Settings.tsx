import { ReactElement, useCallback, useEffect, useState } from "react";
import { CircularProgress, Grid, useTheme } from "@mui/material";
import { useRouter } from "next/router";

import { Event } from "assets/entities/event.entity";
import { useSettings } from "components/Contexts/Settings";
import { WebSocketConnection } from "components/Common/WebSocket";
import Item from "components/Settings/Item";
import Section from "components/Settings/Section";
import { SettingsObject, SettingsValue } from "assets/entities/settings.entity";

let ws: WebSocketConnection;

function Settings(): ReactElement {
  const [settings, setSettings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);

  const query = useRouter().query;

  const eventHandler = useCallback(
    (event: Event) => {
      console.log("Event:", event);
      if (event.type === "SETTINGS_RESULT") {
        console.log("Settings result:", event.data);
        let newSettings: SettingsObject = {};
        event.data.forEach((s: { key: string; value: SettingsValue }) => {
          if (typeof s.value !== "boolean" && !Number.isNaN(Number(s.value)))
            newSettings[s.key] = Number(s.value);
          else newSettings[s.key] = s.value;
        });
        console.log("Settings:", newSettings);
        setSettings(newSettings);
      }
    },
    [setSettings]
  );

  const handleSetup = useCallback(
    (port: number, apiKey: string) => {
      console.log("Setup WebSocketConnection");
      ws = new WebSocketConnection(port, apiKey, async () => {
        ws.getSettings();
      });
      ws.onEvent = eventHandler;
    },
    [eventHandler]
  );

  const handleChanged = useCallback(
    (key: string, value: SettingsValue) => {
      ws.updateSetting(key, value);
      setSettings({ ...settings, [key]: value });
    },
    [settings, setSettings]
  );

  useEffect(() => {
    if (!setup && query && query.apiKey) {
      setSetup(true);
      handleSetup(Number(query.apiPort) || 9170, String(query.apiKey));
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
          <Section name="General" description="General settings">
            <>
              {Object.keys(settings).map((key: string, index: number) => (
                <Item
                  key={index}
                  keyIn={key}
                  valueIn={settings[key]}
                  handleChanged={handleChanged}
                />
              ))}
            </>
          </Section>
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
