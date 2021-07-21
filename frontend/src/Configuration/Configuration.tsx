import { ReactElement, useMemo, useState } from "react";
import {
  Button,
  CircularProgress,
  Container,
  createStyles,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  makeStyles,
  Paper,
  Theme,
  Typography,
} from "@material-ui/core";
import Icon from "@mdi/react";
import {
  mdiAccessPoint,
  mdiAccount,
  mdiKey,
  mdiLock,
  mdiProtocol,
  mdiRestart,
  mdiRocketLaunch,
  mdiTimerOutline,
} from "@mdi/js";

import { parsedQuery } from "../Utils";
import { useSettings } from "../Utils";
import { WebSocketConnection } from "../Common/WebSocket";
import Footer from "../Common/Footer";
import Header from "../Common/Header";
import Section, { ConfigurationSection } from "./Section";

export interface Configuration {
  [section: string]: ConfigurationSection;
}

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
      },
      wsPort: {
        name: "WebSocket Port",
        description: "The port the WebSocket server runs on.",
        defaultValue: 9172,
        value: null,
        icon: mdiProtocol,
        minimum: 1,
        requiresServerRestart: true,
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
      timeout: {
        name: "Observer Timeout (ms)",
        description:
          "The amount of time in milliseconds the observer will wait before checking for new data. The faster, the more updates, but also the more system utilization.",
        defaultValue: 30000,
        value: null,
        minimum: 5000,
        icon: mdiTimerOutline,
        requiresServerRestart: true,
      },
    },
  },
};

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

function ConfigurationComponent(): ReactElement {
  const [restartRequired, setRestartRequired] = useState<boolean>(false);
  const [settings] = useSettings();

  const query = useMemo(() => parsedQuery, []);

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
    <Container className={classes.root} maxWidth="lg">
      <Header name="Settings" />
      <Grid container direction="column" spacing={2} alignItems="stretch">
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
      <Footer />
    </Container>
  );
}

export default ConfigurationComponent;
