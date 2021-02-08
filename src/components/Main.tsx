import React, { ReactElement, useEffect } from "react";
import {
  Box,
  CircularProgress,
  Container,
  createStyles,
  Grid,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";

import { Configuration } from "../configuration";
import { useSettings } from "./Utils";
import Section from "./Section";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    spacer: {
      height: theme.spacing(6),
    },
  })
);

function Main(): ReactElement {
  const [settings, setSettings] = useSettings();

  useEffect(() => {
    if (!settings) {
      window.api.ipcRendererOn("set-settings", (_event, args) => {
        console.log("set-settings:", args);
        const s: Configuration = args;
        setSettings(s);
      });
      window.api.ipcRendererSend("get-settings");
    }
  }, [settings]);

  const classes = useStyles();

  return (
    <Container maxWidth="lg">
      <Typography component="h1" variant="h2">
        System Bridge
      </Typography>
      <Typography component="h2" variant="h4">
        Configuration
      </Typography>
      <Box className={classes.spacer} />
      <Grid container direction="column" spacing={2} alignItems="stretch">
        {!settings ? (
          <Grid container direction="row" justify="center">
            <CircularProgress />
          </Grid>
        ) : (
          Object.keys(settings).map((sectionKey: string) => (
            <Section key={sectionKey} sectionKey={sectionKey} />
          ))
        )}
      </Grid>
    </Container>
  );
}

export default Main;
