import React, { ReactElement } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useRouter } from "next/router";
import {
  Button,
  List,
  Grid,
  Tooltip,
  Typography,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  mdiFileDocumentMultiple,
  mdiForumOutline,
  mdiGithub,
  mdiNotebookEditOutline,
} from "@mdi/js";
import Icon from "@mdi/react";

function HeaderLinks(): ReactElement {
  const query = useRouter().query;

  const theme = useTheme();
  return (
    <Grid container alignContent="center" spacing={2}>
      <Grid item>
        <Link href={{ pathname: "/app/data", query }} passHref>
          <Button color="inherit" variant="text">
            <Typography component="span">Data</Typography>
          </Button>
        </Link>
      </Grid>
      <Grid item>
        <Link href={{ pathname: "/app/settings", query }} passHref>
          <Button color="inherit" variant="text">
            <Typography component="span">Settings</Typography>
          </Button>
        </Link>
      </Grid>
      <Grid item sx={{ padding: theme.spacing(1) }} />
      <Grid item>
        <Tooltip title="Suggest a Feature / Report a Bug">
          <a
            href="https://github.com/timmo001/system-bridge/issues"
            target="_blank"
            rel="noreferrer"
          >
            <IconButton>
              <Icon
                id="issues"
                color={theme.palette.text.primary}
                path={mdiFileDocumentMultiple}
                size={1}
              />
            </IconButton>
          </a>
        </Tooltip>
      </Grid>
      <Grid item>
        <Tooltip title="Discussions/Help">
          <a
            href="https://github.com/timmo001/system-bridge/discussions"
            target="_blank"
            rel="noreferrer"
          >
            <IconButton>
              <Icon
                id="discussions"
                color={theme.palette.text.primary}
                path={mdiForumOutline}
                size={1}
              />
            </IconButton>
          </a>
        </Tooltip>
      </Grid>
      <Grid item>
        <Tooltip title="Contribute to the Website/Documentation">
          <a
            href="https://github.com/timmo001/system-bridge-site"
            target="_blank"
            rel="noreferrer"
          >
            <IconButton>
              <Icon
                id="website"
                color={theme.palette.text.primary}
                path={mdiNotebookEditOutline}
                size={1}
              />
            </IconButton>
          </a>
        </Tooltip>
      </Grid>
      <Grid item>
        <Tooltip title="Contribute to the Application">
          <a
            href="https://github.com/timmo001/system-bridge"
            target="_blank"
            rel="noreferrer"
          >
            <IconButton>
              <Icon
                id="github"
                color={theme.palette.text.primary}
                path={mdiGithub}
                size={1}
              />
            </IconButton>
          </a>
        </Tooltip>
      </Grid>
    </Grid>
  );
}

export default HeaderLinks;
