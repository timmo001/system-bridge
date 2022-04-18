import React, { ReactElement } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useRouter } from "next/dist/client/router";
import { Button, List, ListItem, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  mdiFileDocumentMultiple,
  mdiForumOutline,
  mdiGithub,
  mdiNotebookEditOutline,
} from "@mdi/js";
import Icon from "@mdi/react";

import useStyles from "../../assets/jss/components/headerLinks";

function HeaderLinks(): ReactElement {
  const query = useRouter().query;

  const classes = useStyles();
  const theme = useTheme();
  return (
    <List className={classes.list}>
      <ListItem className={classes.listItem}>
        <Link href={{ pathname: "/app/data", query }} passHref>
          <Button variant="text" className={classes.navLink}>
            <span className={classes.listItemText}>Data</span>
          </Button>
        </Link>
      </ListItem>
      <ListItem className={classes.listItem}>
        <Link href={{ pathname: "/app/settings", query }} passHref>
          <Button variant="text" className={classes.navLink}>
            <span className={classes.listItemText}>Settings</span>
          </Button>
        </Link>
      </ListItem>
      <ListItem className={classes.listItem}>
        <Link href={{ pathname: "/app/logs", query }} passHref>
          <Button variant="text" className={classes.navLink}>
            <span className={classes.listItemText}>Logs</span>
          </Button>
        </Link>
      </ListItem>
      <ListItem className={clsx(classes.listItem, classes.divider)} />
      <ListItem className={classes.listItem}>
        <Tooltip
          title="Suggest a Feature / Report a Bug"
          classes={{ tooltip: classes.tooltip }}
        >
          <Button
            variant="text"
            className={classes.navLink}
            href="https://github.com/timmo001/system-bridge/issues"
            target="_blank"
          >
            <Icon
              color={theme.palette.text.primary}
              path={mdiFileDocumentMultiple}
              size={1}
            />
          </Button>
        </Tooltip>
      </ListItem>
      <ListItem className={classes.listItem}>
        <Tooltip
          title="Discussions/Help"
          classes={{ tooltip: classes.tooltip }}
        >
          <Button
            variant="text"
            className={classes.navLink}
            href="https://github.com/timmo001/system-bridge/discussions"
            target="_blank"
          >
            <Icon
              color={theme.palette.text.primary}
              path={mdiForumOutline}
              size={1}
            />
          </Button>
        </Tooltip>
      </ListItem>
      <ListItem className={classes.listItem}>
        <Tooltip
          title="Contribute to the Website/Documentation"
          classes={{ tooltip: classes.tooltip }}
        >
          <Button
            variant="text"
            className={classes.navLink}
            href="https://github.com/timmo001/system-bridge-site"
            target="_blank"
          >
            <Icon
              color={theme.palette.text.primary}
              path={mdiNotebookEditOutline}
              size={1}
            />
          </Button>
        </Tooltip>
      </ListItem>
      <ListItem className={classes.listItem}>
        <Tooltip
          title="Contribute to the Application"
          classes={{ tooltip: classes.tooltip }}
        >
          <Button
            variant="text"
            className={classes.navLink}
            href="https://github.com/timmo001/system-bridge"
            target="_blank"
          >
            <Icon
              color={theme.palette.text.primary}
              path={mdiGithub}
              size={1}
            />
          </Button>
        </Tooltip>
      </ListItem>{" "}
    </List>
  );
}

export default HeaderLinks;
