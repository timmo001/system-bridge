import React, { ReactElement, useCallback, useEffect, useMemo } from "react";
import { createStyles, Grid, makeStyles, Typography } from "@material-ui/core";

import { parsedQuery, useSettings } from "./Utils";
import Configuration from "./Configuration/Configuration";
import WebRTC from "./WebRTC/WebRTC";
import Player from "./Player/PlayerContainer";

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

  const sendLog = useCallback(
    (
      level: string,
      message: any,
      args: string[] | readonly string[] | undefined
    ): void => {
      try {
        window.api.ipcRendererSend("log", {
          level,
          message: `${query.id} - ${JSON.stringify(message)} ${
            Array.isArray(args)
              ? args.toString()
              : typeof args === "object"
              ? JSON.stringify(args)
              : ""
          }`,
        });
      } catch (e) {}
    },
    [query.id]
  );

  useEffect(() => {
    try {
      if (!settings) {
        document.title = query.title
          ? `${query.title} - System Bridge`
          : "System Bridge";

        window.console.log = (
          msg: string,
          args: string[] | readonly string[] | undefined
        ) => sendLog("info", msg, args);
        window.console.warn = (
          msg: string,
          args: string[] | readonly string[] | undefined
        ) => sendLog("warn", msg, args);
        window.console.error = (
          msg: string,
          args: string[] | readonly string[] | undefined
        ) => sendLog("error", msg, args);

        window.api.ipcRendererOn("set-settings", (_event, args) =>
          setSettings(args)
        );
        window.api.ipcRendererSend("get-settings");
      }
    } catch (e) {
      console.warn("Error getting settings:", e);
    }
  }, [settings, setSettings, sendLog, query]);

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
        <Configuration />
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
