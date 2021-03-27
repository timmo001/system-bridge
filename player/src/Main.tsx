import React, { ReactElement, useEffect } from "react";
import {
  Container,
  createStyles,
  Grid,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";

import { useSettings } from "./Utils";
import logo from "./resources/system-bridge.svg";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    disabled: {
      userSelect: "none",
    },
    smallButton: {
      margin: theme.spacing(-1, -0.5),
    },
    spacer: {
      height: theme.spacing(6),
    },
    headerItem: {
      margin: theme.spacing(1, 1, 0),
    },
  })
);

function Main(): ReactElement {
  const [settings, setSettings] = useSettings();

  useEffect(() => {
    if (!settings) {
      window.api.ipcRendererSend("get-settings");
    }
  }, [settings, setSettings]);

  const classes = useStyles();

  return (
    <Container maxWidth="sm">
      <Grid
        container
        direction="row"
        alignItems="center"
        justify="flex-start"
        spacing={2}
      >
        <Grid item>
          <img src={logo} alt="Album" />
        </Grid>
        <Grid item xs>
          <Grid
            container
            direction="column"
            alignItems="flex-start"
            justify="space-around"
          >
            <Grid item>
              <Typography color="textPrimary" component="span" variant="h5">
                Artist - Track
              </Typography>
            </Grid>
            <Grid item>
              <Typography
                color="textSecondary"
                component="span"
                variant="subtitle1"
              >
                Album
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Main;
