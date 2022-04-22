import { ReactElement, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/dist/client/router";
import { CircularProgress, Grid, Tab, Tabs, useTheme } from "@mui/material";

import { Event } from "../../assets/entities/event.entity";
import { useSettings } from "../Contexts/Settings";
import { WebSocketConnection } from "../Common/WebSocket";
import DataItems from "./DataItems";
import { TabPanel } from "@mui/lab";

export interface WorkerData {
  service: string;
  method: "findAll" | string;
  observe: boolean;
}

const modules = [
  "battery",
  "bridge",
  "cpu",
  "disk",
  "memory",
  "network",
  "sensors",
  "system",
];

const moduleMap: { [key: string]: string } = {
  battery: "Battery",
  bridge: "Bridge",
  cpu: "CPU",
  disk: "Disk",
  memory: "Memory",
  network: "Network",
  sensors: "Sensors",
  system: "System",
};

function a11yProps(index: any) {
  return {
    id: `scrollable-auto-tab-${index}`,
    "aria-controls": `scrollable-auto-tabpanel-${index}`,
  };
}

interface DataMap {
  [key: string]: { [key: string]: any };
}

function DataComponent(): ReactElement {
  const [data, setData] = useState<DataMap>({});
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

  const eventHandler = useCallback(
    (event: Event) => {
      console.log("Event:", event);
      if (
        event.type === "DATA_UPDATE" &&
        event.module &&
        modules.includes(event.module)
      ) {
        console.log("Data update:", moduleMap[event.module], event.data);
        setData({ ...data, [event.module]: event.data });
      }
    },
    [data]
  );

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
        <Grid container direction="row" item xs>
          <Grid item>
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={tab}
              onChange={handleChangeTab}
            >
              {modules.map((module: string, index: number) => (
                <Tab
                  key={index}
                  label={moduleMap[module]}
                  {...a11yProps(index)}
                />
              ))}
            </Tabs>
          </Grid>
          <Grid item xs>
            {modules.map((module: string, index: number) => (
              <>
                {tab === index ? (
                  <>
                    {data[module] ? (
                      <DataItems data={data[module]} name={moduleMap[module]} />
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
                  </>
                ) : (
                  ""
                )}
              </>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default DataComponent;
