import { ReactElement, useEffect, useMemo, useState } from "react";
import {
  Box,
  createStyles,
  Grid,
  IconButton,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";
import { mdiContentCopy } from "@mdi/js";
import axios, { AxiosResponse } from "axios";
import clsx from "clsx";
import Icon from "@mdi/react";

import { handleCopyToClipboard, parsedQuery } from "../Utils";
import logo from "../resources/system-bridge.svg";

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
    headerItem: {
      margin: theme.spacing(1, 1, 0),
    },
    smallButton: {
      margin: theme.spacing(-1, -0.5),
    },
    spacer: {
      height: theme.spacing(6),
    },
    version: {
      margin: theme.spacing(3, 2, 0),
    },
  })
);

function Header({ name }: { name: string }): ReactElement {
  const [appInfo, setAppInfo] = useState<ApplicationInfo>();

  const query = useMemo(() => parsedQuery, []);

  useEffect(() => {
    if (!appInfo) {
      document.title = `${name} - System Bridge`;
      axios
        .get<ApplicationInfo>(
          `http://${query.apiHost || "localhost"}:${
            query.apiPort || 9170
          }/information`,
          {
            headers: { "api-key": query.apiKey },
          }
        )
        .then((response: AxiosResponse<ApplicationInfo>) => {
          setAppInfo(response.data);
        });
    }
  }, [appInfo, name, setAppInfo, query]);

  const classes = useStyles();

  return (
    <>
      <Grid container alignItems="flex-start" justifyContent="flex-start">
        <Grid className={classes.disabled} item>
          <Typography component="h1" variant="h2">
            System Bridge
          </Typography>
          <Typography component="h2" variant="h4">
            {name}
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
                    href={appInfo.updates?.url}
                    target="_blank"
                    rel="noreferrer"
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
        <Grid className={clsx(classes.headerItem, classes.version)} item xs={4}>
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
          {appInfo?.uuid ? (
            <Typography component="h5" variant="subtitle1">
              <span className={classes.disabled}>UUID: </span>
              {appInfo.uuid}
              <IconButton
                className={classes.smallButton}
                aria-label="Copy to clipboard"
                onClick={() => handleCopyToClipboard(appInfo.uuid)}
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
          <a
            href="https://system-bridge.timmo.dev"
            target="_blank"
            rel="noreferrer"
          >
            <img src={logo} alt="System Bridge Logo" />
          </a>
        </Grid>
      </Grid>
      <Box className={classes.spacer} />
    </>
  );
}

export default Header;
