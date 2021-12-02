import { ReactElement, useState } from "react";
import { useRouter } from "next/dist/client/router";
import {
  Button,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Theme,
  Typography,
} from "@mui/material";
import { mdiRestart } from "@mdi/js";
import createStyles from "@mui/styles/createStyles";
import Icon from "@mdi/react";
import makeStyles from "@mui/styles/makeStyles";

import { useSettings } from "../Contexts/Settings";
import { WebSocketConnection } from "../Common/WebSocket";
import Section from "./Section";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      padding: theme.spacing(2),
    },
    center: {
      textAlign: "center",
    },
    disabled: {
      userSelect: "none",
    },
    secondaryAction: {
      width: 400,
      textAlign: "end",
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
    version: {
      margin: theme.spacing(3, 2, 0),
    },
  })
);

function Settings(): ReactElement {
  const [restartRequired, setRestartRequired] = useState<boolean>(false);
  const [settings] = useSettings();

  const query = useRouter().query;

  function handleServerRestartRequired(): void {
    setRestartRequired(true);
  }

  function handleRestartServer(): void {
    const ws = new WebSocketConnection(
      Number(query.wsPort) || 9172,
      String(query.apiKey),
      false,
      async () => {
        ws.sendEvent({ name: "restart-server", data: { openSettings: true } });
        await ws.close();
        window.close();
      }
    );
  }

  const classes = useStyles();

  return (
    <>
      <Grid
        container
        className={classes.root}
        direction="column"
        spacing={2}
        alignItems="stretch"
      >
        <Grid container direction="row" item xs={12}>
          <Grid item xs={4} className={classes.disabled}>
            <Typography component="h3" variant="h5">
              Server
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Paper>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Icon title="Restart Server" size={1} path={mdiRestart} />
                  </ListItemIcon>
                  <ListItemText
                    className={classes.disabled}
                    primary={`Restart Server${
                      restartRequired ? " (Restart Required)" : ""
                    }`}
                    secondary="Restart the server. This is required when changing any network settings."
                  />
                  <ListItemSecondaryAction className={classes.secondaryAction}>
                    <Button
                      aria-label="Restart Server"
                      color="primary"
                      variant="contained"
                      onClick={handleRestartServer}
                    >
                      <Icon
                        title="Restart Server"
                        size={0.8}
                        path={mdiRestart}
                      />
                      Restart Server
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
        {!settings ? (
          <Grid container direction="row" justifyContent="center">
            <CircularProgress />
          </Grid>
        ) : (
          Object.keys(settings).map((sectionKey: string) => (
            <Section
              key={sectionKey}
              sectionKey={sectionKey}
              handleServerRestartRequired={handleServerRestartRequired}
            />
          ))
        )}
      </Grid>
    </>
  );
}

export default Settings;
