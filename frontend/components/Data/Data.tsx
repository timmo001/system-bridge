import { ReactElement, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/dist/client/router";
import { CircularProgress, Grid, Tab, Tabs, useTheme } from "@mui/material";

import { Event } from "../../assets/entities/event.entity";
import { useSettings } from "../Contexts/Settings";
import { WebSocketConnection } from "../Common/WebSocket";
import DataItems from "./DataItems";

export interface WorkerData {
  service: string;
  method: "findAll" | string;
  observe: boolean;
}

const modules = ["cpu", "memory"];

const items: Array<WorkerData> = modules.map((service: string) => ({
  service: service,
  method: "findAll",
  observe: false,
}));

function a11yProps(index: any) {
  return {
    id: `scrollable-auto-tab-${index}`,
    "aria-controls": `scrollable-auto-tabpanel-${index}`,
  };
}

function DataComponent(): ReactElement {
  const [settings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);
  const [tab, setTab] = useState<number>(0);

  const query = useRouter().query;

  const handleChangeTab = (
    _event: React.ChangeEvent<any>,
    newValue: number
  ) => {
    setTab(newValue);
  };

  const eventHandler = useCallback((event: Event) => {
    console.log("Event:", event);
    // if (
    //   name.includes("data-") &&
    //   service &&
    //   services.findIndex((s: string) => s === service) > -1 &&
    //   method === "findAll" &&
    //   data
    // ) {
    //   console.log("Data update:", name, service, data);
    //   switch (service) {
    //     default:
    //       break;
    //   }
    // }
  }, []);

  const handleSetup = useCallback(
    (port: number, apiKey: string) => {
      console.log("Setup WebSocketConnection");
      const ws = new WebSocketConnection(port, apiKey, async () => {
        ws.getData(modules);
        ws.registerDataListener(modules);
      });
      ws.onEvent = eventHandler;
    },
    [eventHandler]
  );

  useEffect(() => {
    if (!setup && query && query.apiKey) {
      setSetup(true);
      handleSetup(Number(query.apiPort) || 9170, String(query.apiKey));
    }
  }, [setup, handleSetup, query]);

  const theme = useTheme();

  return (
    <>
      <Grid
        container
        direction="column"
        spacing={2}
        alignItems="stretch"
        sx={{ padding: theme.spacing(2) }}
      >
        {settings ? (
          <Grid container direction="row" item xs>
            <Grid item>
              <Tabs
                orientation="vertical"
                variant="scrollable"
                value={tab}
                onChange={handleChangeTab}
              >
                <Tab label="CPU" {...a11yProps(0)} />
                <Tab label="Memory" {...a11yProps(0)} />
              </Tabs>
            </Grid>
            <Grid item xs>
              {/* <DataItems */}
            </Grid>
          </Grid>
        ) : (
          <Grid
            container
            direction="row"
            justifyContent="center"
            sx={{ margin: theme.spacing(8, 0, 14) }}
          >
            <CircularProgress />
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default DataComponent;
