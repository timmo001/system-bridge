import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CircularProgress,
  Container,
  createStyles,
  Grid,
  IconButton,
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
      height: 540,
      minHeight: 540,
      maxHeight: 540,
      maxWidth: "100%",
      overflowY: "auto",
    },
  })
);

function LogsComponent(): ReactElement {
  const [logs, setLogs] = useState<string>();
  const [settings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);

  const refBottom = useRef<any>(null);

  const query = useMemo(() => parsedQuery, []);

  const handleSetup = useCallback(async () => {
    console.log("Setup Logs");
    const response = await axios.get<Array<string>>(
      `http://${query.apiHost || "localhost"}:${query.apiPort || 9170}/logs`,
      {
        headers: { "api-key": query.apiKey },
      }
    );
    if (response && response.status < 400) {
      const data: string = response.data.slice(-251).join("\n");
      setLogs(data);
      if (refBottom.current)
        refBottom.current.scrollIntoView({ behavior: "smooth" });
    }
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
      <Header name="Logs" />
      {!settings ? (
        <Grid container direction="row" justifyContent="center">
          <CircularProgress />
        </Grid>
      ) : (
        <>
          <Grid item container direction="row" justifyContent="flex-end">
            <IconButton aria-label="Refresh Logs" onClick={() => handleSetup()}>
              <Icon title="Refresh Logs" size={1} path={mdiRefresh} />
            </IconButton>
          </Grid>
          <Grid className={classes.logsContainer} item>
            <Typography component="pre" variant="body2" color="textSecondary">
              {logs}
              <div ref={refBottom} />
            </Typography>
          </Grid>
        </>
      )}
      <Footer />
    </Container>
  );
}

export default LogsComponent;
