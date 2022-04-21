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
  const [restartRequired, setRestartRequired] = useState<boolean>(false);
  const [settings] = useSettings();

  const query = useRouter().query;

  const handleServerRestartRequired = useCallback(() => {
    setRestartRequired(true);
  }, []);

  const handleRestartServer = useCallback(() => {
    const ws = new WebSocketConnection(
      Number(query.wsPort) || 9172,
      String(query.apiKey),
      false,
      async () => {
        ws.sendEvent({ name: "restart-server", data: { openSettings: true } });
        await ws.close();
        if (typeof window !== "undefined") window.close();
      }
    );
  }, [query]);

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
        <Grid container direction="row" item xs={12}>
          <Grid
            item
            xs={4}
            sx={{
              userSelect: "none",
            }}
          >
            <Typography component="h3" variant="h5">
              Server
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Paper>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Icon
                      id="restart-server"
                      title="Restart Server"
                      size={1}
                      path={mdiRestart}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Restart Server${
                      restartRequired ? " (Restart Required)" : ""
                    }`}
                    secondary="Restart the server. This is required when changing any network settings."
                    sx={{
                      userSelect: "none",
                    }}
                  />
                  <ListItemSecondaryAction
                    sx={{ width: 400, textAlign: "end" }}
                  >
                    <Button
                      aria-label="Restart Server"
                      color="primary"
                      variant="contained"
                      onClick={handleRestartServer}
                    >
                      <Icon
                        id="restart-server"
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
          <Grid
            container
            direction="row"
            justifyContent="center"
            sx={{ margin: theme.spacing(10, 0, 8) }}
          >
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
