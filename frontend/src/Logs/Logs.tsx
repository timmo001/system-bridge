import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  CircularProgress,
  Container,
  createStyles,
  Fab,
  Grid,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";
import { Icon } from "@mdi/react";
import { mdiRefresh } from "@mdi/js";
import axios from "axios";

import { parsedQuery, useSettings } from "../Utils";
import Footer from "../Common/Footer";
import Header from "../Common/Header";

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
    logsContainer: {
      height: 600,
      minHeight: 600,
      maxHeight: 600,
      maxWidth: "100%",
      overflowY: "auto",
    },
    refresh: {
      position: "fixed",
      right: theme.spacing(2),
      bottom: theme.spacing(2),
    },
  })
);

function DataComponent(): ReactElement {
  const [logs, setLogs] = useState<string>();
  const [settings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);

  const query = useMemo(() => parsedQuery, []);

  const handleSetup = useCallback(async () => {
    console.log("Setup Logs");
    const response = await axios.get<string>(
      `http://${query.apiHost || "localhost"}:${query.apiPort || 9170}/logs`,
      {
        headers: { "api-key": query.apiKey },
      }
    );
    if (response && response.status < 400) setLogs(response.data);
  }, [query.apiHost, query.apiPort, query.apiKey]);

  useEffect(() => {
    if (!setup) {
      setSetup(true);
      handleSetup();
    }
  }, [setup, handleSetup, query.apiKey, query.wsPort]);

  const classes = useStyles();

  return (
    <Container className={classes.root} maxWidth="lg">
      <Header name="Data" />
      <Grid container direction="column" spacing={2} alignItems="stretch">
        {!settings ? (
          <Grid container direction="row" justifyContent="center">
            <CircularProgress />
          </Grid>
        ) : (
          <Grid className={classes.logsContainer} item>
            <Typography component="pre" variant="body2" color="textSecondary">
              {logs}
            </Typography>
          </Grid>
        )}
      </Grid>
      <Fab
        className={classes.refresh}
        aria-label="Refresh Logs"
        onClick={() => handleSetup()}
      >
        <Icon title="Refresh Logs" size={1} path={mdiRefresh} />
      </Fab>
      <Footer />
    </Container>
  );
}

export default DataComponent;
