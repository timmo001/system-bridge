import React, { ReactElement, useEffect, useMemo } from "react";
import { createStyles, Grid, makeStyles, Typography } from "@material-ui/core";
import axios, { AxiosResponse } from "axios";

import { parsedQuery, useSettings } from "./Utils";
import { Setting } from "./types/settings";
import ConfigurationComponent, {
  Configuration,
  defaultConfiguration,
} from "./Configuration/Configuration";
import Player from "./Player/PlayerContainer";
import WebRTC from "./WebRTC/WebRTC";

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      height: "100%",
      display: "flex",
    },
  })
);

function Main(): ReactElement {
  const [settings, setSettings] = useSettings();

  const query = useMemo(() => parsedQuery, []);

  useEffect(() => {
    try {
      if (!settings) {
        document.title = query.title
          ? `${query.title} - System Bridge`
          : "System Bridge";

        axios
          .get<Setting[]>(
            `http://${query.apiHost || "localhost"}:${
              query.apiPort || 9170
            }/settings`,
            {
              headers: { "api-key": query.apiKey },
            }
          )
          .then((response: AxiosResponse<Setting[]>) => {
            let s: Configuration = defaultConfiguration;
            Object.keys(s).forEach((sectionKey: string) => {
              Object.keys(s[sectionKey].items).forEach((itemKey: string) => {
                let settingValue = response.data.find(({ key }: Setting) => {
                  const keys = key.split("-");
                  return keys[0] === sectionKey && keys[1] === itemKey;
                })?.value;
                const defaultValue = s[sectionKey].items[itemKey].defaultValue;
                const value =
                  settingValue || s[sectionKey].items[itemKey].defaultValue;
                s[sectionKey].items[itemKey].value =
                  typeof defaultValue === "boolean"
                    ? value === "true"
                    : typeof defaultValue === "number"
                    ? Number(value)
                    : value;
                if (!settingValue)
                  axios.post<Setting>(
                    `http://${query.apiHost || "localhost"}:${
                      query.apiPort || 9170
                    }/settings`,
                    {
                      key: `${sectionKey}-${itemKey}`,
                      value: String(s[sectionKey].items[itemKey].defaultValue),
                    },
                    {
                      headers: { "api-key": query.apiKey },
                    }
                  );
              });
            });
            setSettings(s);
          });
      }
    } catch (e) {
      console.warn("Error getting settings:", e);
    }
  }, [settings, setSettings, query]);

  const classes = useStyles();

  return (
    <div
      className={classes.root}
      style={{
        background:
          typeof query.background === "string" ? query.background : "#121212",
      }}
    >
      {query.id === "configuration" ? (
        <ConfigurationComponent />
      ) : query.id === "player" ? (
        <Player />
      ) : query.id === "webrtc" ? (
        <WebRTC />
      ) : (
        <Grid
          className={classes.root}
          container
          alignItems="center"
          justify="center"
        >
          <Typography color="textPrimary" component="h2" variant="h4">
            Page not found
          </Typography>
        </Grid>
      )}
    </div>
  );
}

export default Main;
