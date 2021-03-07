import React, { ReactElement, useEffect, useState } from "react";
import clsx from "clsx";
import {
  Box,
  CircularProgress,
  Container,
  createStyles,
  Grid,
  IconButton,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";
import Icon from "@mdi/react";
import { mdiContentCopy } from "@mdi/js";

import { Configuration } from "../../src/configuration";
import { handleCopyToClipboard, useSettings } from "./Utils";
import Section from "./Settings/Section";
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
    version: {
      margin: theme.spacing(3, 2, 0),
    },
  })
);

interface AppInfo {
  address: string;
  fqdn: string;
  host: string;
  ip: string;
  mac: string;
  port: number;
  version: string;
}

function Main(): ReactElement {
  const [settings, setSettings] = useSettings();
  const [appInfo, setAppInfo] = useState<AppInfo>();

  useEffect(() => {
    if (!settings) {
      window.api.ipcRendererOn("set-settings", (_event, args) => {
        console.log("set-settings:", args);
        const s: Configuration = args;
        setSettings(s);
      });
      window.api.ipcRendererSend("get-settings");

      window.api.ipcRendererOn("app-information", (_event, args) => {
        console.log("set-app-info:", args);
        setAppInfo(args);
      });
      window.api.ipcRendererSend("get-app-information");
    }
  }, [settings, setSettings]);

  const classes = useStyles();

  return (
    <Container maxWidth="lg">
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
            <Typography component="h3" variant="h5">
              v{appInfo.version}
            </Typography>
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
      <Box className={classes.spacer} />
      <Grid container direction="row" justify="center">
        <Typography component="span" variant="body1">
          Found an issue? Report it{" "}
          <a
            href={window.location.href}
            onClick={() =>
              window.api.ipcRendererSend(
                "open-url",
                "https://github.com/timmo001/system-bridge/issues/new/choose"
              )
            }
          >
            here
          </a>
          .
        </Typography>
      </Grid>
      <Grid container direction="row" justify="center">
        <Typography component="span" variant="body1">
          Thought of a feature that could be added? Suggest it{" "}
          <a
            href={window.location.href}
            onClick={() =>
              window.api.ipcRendererSend(
                "open-url",
                "https://github.com/timmo001/system-bridge/issues/new/choose"
              )
            }
          >
            here
          </a>
          .
        </Typography>
      </Grid>
      <Box className={classes.spacer} />
      <Grid container direction="row" justify="center">
        <Typography component="span" variant="body1">
          Participate in discussions and get help{" "}
          <a
            href={window.location.href}
            onClick={() =>
              window.api.ipcRendererSend(
                "open-url",
                "https://github.com/timmo001/system-bridge/discussions"
              )
            }
          >
            here
          </a>
          .
        </Typography>
      </Grid>
    </Container>
  );
}

export default Main;
