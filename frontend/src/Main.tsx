import React, { ReactElement, useEffect, useMemo } from "react";
import {
  createStyles,
  Grid,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";

import { parsedQuery, useSettings } from "./Utils";
import Configuration from "./Configuration/Configuration";
import WebRTC from "./WebRTC/WebRTC";
import Player from "./Player/Player";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      height: "100%",
    },
  })
);

function Main(): ReactElement {
  const [settings, setSettings] = useSettings();

  const query = useMemo(() => parsedQuery, []);

  useEffect(() => {
    try {
      if (!settings) {
        window.api.ipcRendererOn("set-settings", (_event, args) => {
          console.log("set-settings:", args);
          setSettings(args);
        });
        window.api.ipcRendererSend("get-settings");
      }
    } catch (e) {
      console.warn("Error getting settings:", e);
    }
  }, [settings, setSettings]);

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
