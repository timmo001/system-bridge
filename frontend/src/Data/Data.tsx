import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  CircularProgress,
  Container,
  createStyles,
  Grid,
  makeStyles,
  Theme,
} from "@material-ui/core";

import { Event } from "../types/event.entity";
import { parsedQuery, useSettings } from "../Utils";
import { WebSocketConnection } from "../Common/WebSocket";
import Footer from "../Common/Footer";
import Header from "../Common/Header";

const dataItems = [
  "audio",
  "battery",
  "bluetooth",
  "cpu",
  "display",
  "filesystem",
  "graphics",
  "keyboard",
  "memory",
  "network",
  "os",
  "processes",
  "system",
  "usb",
];

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
  })
);

function DataComponent(): ReactElement {
  const [allData, setData] = useState<{ [name: string]: any }>();
  const [settings] = useSettings();

  const query = useMemo(() => parsedQuery, []);

  const setup = useCallback(() => {
    setData({});
    const ws = new WebSocketConnection(
      Number(query.wsPort) || 9172,
      String(query.apiKey),
      true,
      async () => {
        ws.sendEvent({
          name: "get-data",
          data: dataItems,
        });
      }
    );
    ws.onEvent = ({ name, data }: Event) => {
      console.log("Event:", { name, data });
      if (name.includes("data-") || name.includes("observer-")) {
        const key = dataItems.find((item: string) => name.includes(item));
        if (key) setData({ ...allData, [key]: data });
      }
    };
  }, [allData, query.apiKey, query.wsPort]);

  useEffect(() => {
    if (!allData) setup();
  }, [allData, setup]);

  const classes = useStyles();

  console.log("allData:", allData);

  return (
    <Container className={classes.root} maxWidth="lg">
      <Header name="Data" />
      <Grid container direction="column" spacing={2} alignItems="stretch">
        {!settings ? (
          <Grid container direction="row" justifyContent="center">
            <CircularProgress />
          </Grid>
        ) : (
          <Grid container direction="row" justifyContent="center"></Grid>
        )}
      </Grid>
      <Footer />
    </Container>
  );
}

export default DataComponent;
