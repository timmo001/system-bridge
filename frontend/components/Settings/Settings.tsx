import { ReactElement, useCallback, useState } from "react";
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
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiRestart } from "@mdi/js";

import { useSettings } from "../Contexts/Settings";
import { WebSocketConnection } from "../Common/WebSocket";
import Section from "./Section";

function Settings(): ReactElement {
  const [settings] = useSettings();

  const query = useRouter().query;

  const theme = useTheme();

  return (
    <>
      <Grid
        container
        direction="column"
        spacing={2}
        alignItems="stretch"
        sx={{
          padding: theme.spacing(2),
        }}
      >
        {!settings ? (
          <Grid
            container
            direction="row"
            justifyContent="center"
            sx={{ margin: theme.spacing(2, 0, 10) }}
          >
            <CircularProgress />
          </Grid>
        ) : (
          Object.keys(settings).map((sectionKey: string) => (
            <Section key={sectionKey} sectionKey={sectionKey} />
          ))
        )}
      </Grid>
    </>
  );
}

export default Settings;
