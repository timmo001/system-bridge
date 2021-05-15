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

import { handleCopyToClipboard } from "../Utils";
import { useSettings } from "../Utils";
import logo from "../resources/system-bridge.svg";
import Section from "./Section";

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

function Configuration(): ReactElement {
  const [appInfo, setAppInfo] = useState<ApplicationInfo>();
  const [settings] = useSettings();

  useEffect(() => {
    if (!appInfo) {
      try {
        window.api.ipcRendererOn(
          "app-information",
          (_event, info: ApplicationInfo) => setAppInfo(info)
        );
        window.api.ipcRendererSend("get-app-information");
        console.log("get-app-information");
      } catch (e) {
        console.warn("Error calling window.api:", e);
      }
    }
  }, [appInfo, setAppInfo]);

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
            <>
              <Typography component="h3" variant="h5">
                {appInfo.version}
              </Typography>
              <Typography component="h4" variant="subtitle1">
                {appInfo.updates?.available ? (
                  <a
                    href={window.location.href}
                    onClick={() => {
                      try {
                        window.api.ipcRendererSend(
                          "open-url",
                          appInfo.updates?.url
                        );
                      } catch (e) {
                        console.warn("Error calling window.api:", e);
                      }
                    }}
                  >
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
            onClick={() => {
              try {
                window.api.ipcRendererSend(
                  "open-url",
                  "https://github.com/timmo001/system-bridge/issues/new/choose"
                );
              } catch (e) {
                console.warn("Error calling window.api:", e);
              }
            }}
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
            onClick={() => {
              try {
                window.api.ipcRendererSend(
                  "open-url",
                  "https://github.com/timmo001/system-bridge/issues/new/choose"
                );
              } catch (e) {
                console.warn("Error calling window.api:", e);
              }
            }}
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
            onClick={() => {
              try {
                window.api.ipcRendererSend(
                  "open-url",
                  "https://github.com/timmo001/system-bridge/discussions"
                );
              } catch (e) {
                console.warn("Error calling window.api:", e);
              }
            }}
          >
            here
          </a>
          .
        </Typography>
      </Grid>
    </Container>
  );
}

export default Configuration;
