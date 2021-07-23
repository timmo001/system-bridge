import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  CircularProgress,
  Container,
  createStyles,
  Grid,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";

import { Event } from "../types/event.entity";
import { parsedQuery, useSettings } from "../Utils";
import { WebSocketConnection } from "../Common/WebSocket";
import Footer from "../Common/Footer";
import Header from "../Common/Header";

const items = [
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
  const [dataItems, setDataItems] = useState<Array<Event>>([]);
  const [setup, setSetup] = useState<boolean>(false);
  const [settings] = useSettings();

  const query = useMemo(() => parsedQuery, []);

  const eventHandler = useCallback(
    ({ name, data }: Event) => {
      if (name.includes("data-") || name.includes("observer-")) {
        const key = items.find((item: string) => name.includes(item));
        if (key) {
          const event = { name: key, data: data };
          const id = dataItems.findIndex((item: Event) => item.name === key);
          console.log("Event:", id, event);
          if (id > -1) dataItems[id] = event;
          else dataItems.push(event);
          dataItems.sort((a: Event, b: Event) => a.name.localeCompare(b.name));
          setDataItems(dataItems);
        }
      }
    },
    [dataItems]
  );

  const handleSetup = useCallback(
    (wsPort: number, apiKey: string) => {
      console.log("Setup WebSocketConnection");
      const ws = new WebSocketConnection(wsPort, apiKey, true, async () => {
        ws.sendEvent({ name: "get-data", data: items });
      });
      // setInterval(() => {
      //   dataItems.push({ name: "test", data: { test: Math.random() * 100 } });
      //   setDataItems(dataItems);
      // }, 1000);
      ws.onEvent = eventHandler;
    },
    [eventHandler]
  );

  useEffect(() => {
    if (!setup) {
      setSetup(true);
      handleSetup(Number(query.wsPort) || 9172, String(query.apiKey));
    }
  }, [setup, handleSetup, query.apiKey, query.wsPort]);

  console.log("update:", dataItems);

  const classes = useStyles();

  return (
    <Container className={classes.root} maxWidth="lg">
      <Header name="Data" />
      <Grid container direction="column" spacing={2} alignItems="stretch">
        {!settings || !dataItems ? (
          <Grid container direction="row" justifyContent="center">
            <CircularProgress />
          </Grid>
        ) : (
          <>
            {dataItems.map((item: Event) => (
              <Grid key={item.name} item xs>
                <Typography component="p" variant="body1">
                  {item.name}
                </Typography>
                <Typography component="p" variant="body1">
                  {item.data
                    ? Array.isArray(item.data)
                      ? JSON.stringify(item.data[0])
                      : JSON.stringify(Object.values(item.data)[0])
                    : "No data"}
                </Typography>
              </Grid>
            ))}
          </>
        )}
      </Grid>
      <Footer />
    </Container>
  );
}

export default DataComponent;
