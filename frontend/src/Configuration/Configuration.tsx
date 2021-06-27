import React, { ReactElement, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  createStyles,
  Grid,
  IconButton,
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
  mdiContentCopy,
  mdiKey,
  mdiProtocol,
  mdiRestart,
  mdiRocketLaunch,
} from "@mdi/js";

import { handleCopyToClipboard, parsedQuery } from "../Utils";
import { useSettings } from "../Utils";
import logo from "../resources/system-bridge.svg";
import Section, { ConfigurationSection } from "./Section";
import { WebSocketConnection } from "../Common/WebSocket";

export interface ApplicationInfo {
  address: string;
  fqdn: string;
  host: string;
  ip: string;
  mac: string;
  port: number;
  updates?: ApplicationUpdate;
  uuid: string;
  version: string;
  websocketAddress: string;
  websocketPort: number;
}

export interface ApplicationUpdate {
  available: boolean;
  url: string;
  version: { current: string; new: string };
}

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
        requiresServerRestart: true,
      },
      wsPort: {
        name: "WebSocket Port",
        description: "The port the WebSocket server runs on.",
        defaultValue: 9172,
        value: null,
        icon: mdiProtocol,
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
  // const [appInfo, setAppInfo] = useState<ApplicationInfo>();
  const [appInfo] = useState<ApplicationInfo>();
  const [restartRequired, setRestartRequired] = useState<boolean>(false);
  const [settings] = useSettings();

  const query = useMemo(() => parsedQuery, []);

  // TODO: Implement
  // useEffect(() => {
  //   if (!appInfo) {
  //     axios
  //       .get<ApplicationInfo>(
  //         `http://${query.apiHost || "localhost"}:${query.apiPort || 9170}/info`,
  //         {
  //           headers: { "api-key": query.apiKey },
  //         }
  //       )
  //       .then((response: AxiosResponse<ApplicationInfo>) => {
  //         setAppInfo(response.data);
  //       });
  //   }
  // }, [appInfo, setAppInfo, query]);

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
      <Grid container alignItems="flex-start" justify="flex-start">
        <Grid className={classes.disabled} item>
          <Typography component="h1" variant="h2">
            System Bridge
          </Typography>
          <Typography component="h2" variant="h4">
            Settings
          </Typography>
        </Grid>
        <Grid
          className={clsx(
            classes.disabled,
            classes.headerItem,
            classes.version
          )}
          item
          xs
        >
          {appInfo?.version ? (
            <>
              <Typography component="h3" variant="h5">
                {appInfo.version}
              </Typography>
              <Typography component="h4" variant="subtitle1">
                {appInfo.updates?.available ? (
                  <a href={appInfo.updates?.url}>
                    Version {appInfo.updates.version.new} avaliable!
                  </a>
                ) : (
                  ""
                )}
              </Typography>
            </>
          ) : (
            ""
          )}
        </Grid>
        <Grid className={clsx(classes.headerItem, classes.version)} item xs>
          {appInfo?.host ? (
            <Typography component="h5" variant="subtitle1">
              <span className={classes.disabled}>Host: </span>
              {appInfo.host}
              <IconButton
                className={classes.smallButton}
                aria-label="Copy to clipboard"
                onClick={() => handleCopyToClipboard(appInfo.host)}
              >
                <Icon
                  title="Copy to clipboard"
                  size={0.8}
                  path={mdiContentCopy}
                />
              </IconButton>
            </Typography>
          ) : (
            ""
          )}
          {appInfo?.ip ? (
            <Typography component="h5" variant="subtitle1">
              <span className={classes.disabled}>IP: </span>
              {appInfo.ip}
              <IconButton
                className={classes.smallButton}
                aria-label="Copy to clipboard"
                onClick={() => handleCopyToClipboard(appInfo.ip)}
              >
                <Icon
                  title="Copy to clipboard"
                  size={0.8}
                  path={mdiContentCopy}
                />
              </IconButton>
            </Typography>
          ) : (
            ""
          )}
        </Grid>
        <Grid className={classes.headerItem} item>
          <img src={logo} alt="System Bridge Logo" />
        </Grid>
      </Grid>
      <Box className={classes.spacer} />
      <Grid container direction="column" spacing={2} alignItems="stretch">
        <Grid container direction="row" item xs={12}>
          <Grid item xs={4}>
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
          <Grid container direction="row" justify="center">
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
      <Box className={classes.spacer} />
      <Grid container direction="row" justify="center">
        <Typography component="span" variant="body1">
          Found an issue? Report it{" "}
          <a href="https://github.com/timmo001/system-bridge/issues/new/choose">
            here
          </a>
          .
        </Typography>
      </Grid>
      <Grid container direction="row" justify="center">
        <Typography component="span" variant="body1">
          Thought of a feature that could be added? Suggest it{" "}
          <a href="https://github.com/timmo001/system-bridge/issues/new/choose">
            here
          </a>
          .
        </Typography>
      </Grid>
      <Box className={classes.spacer} />
      <Grid container direction="row" justify="center">
        <Typography component="span" variant="body1">
          Participate in discussions and get help{" "}
          <a href="https://github.com/timmo001/system-bridge/discussions">
            here
          </a>
          .
        </Typography>
      </Grid>
    </Container>
  );
}

export default ConfigurationComponent;
