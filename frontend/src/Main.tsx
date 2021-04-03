import React, { ReactElement, useEffect } from "react";
import { Switch, Route } from "react-router-dom";
import {
  createStyles,
  Grid,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";

import { useQuery, useSettings } from "./Utils";
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
  const query = useQuery();

  const [settings, setSettings] = useSettings();

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
    <Switch>
      <Route path="/">
        <div
          className={classes.root}
          style={{
            background: query.get("background") || "#121212",
          }}
        >
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
        </div>
      </Route>
      <Route path="/configuration">
        <Configuration />
      </Route>
      <Route path="/player">
        <Player />
      </Route>
      <Route path="/webrtc">
        <WebRTC />
      </Route>
    </Switch>
  );
}

export default Main;
