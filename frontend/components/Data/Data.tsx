import { ReactElement, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/dist/client/router";
import { CircularProgress, Grid, Tab, Tabs, Theme } from "@mui/material";

import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";

import { Event } from "../../assets/entities/event.entity";
import { useSettings } from "../Contexts/Settings";
import { WebSocketConnection } from "../Common/WebSocket";
import DataItems from "./DataItems";

export interface WorkerData {
  service: string;
  method: "findAll" | string;
  observe: boolean;
}

const services = [
  "audio",
  "battery",
  "bluetooth",
  "cpu",
  "display",
  "filesystem",
  "graphics",
  "information",
  "memory",
  "network",
  "os",
  "processes",
  "system",
  "usb",
];

const items: Array<WorkerData> = services.map((service: string) => ({
  service: service,
  method: "findAll",
  observe: false,
}));

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

function a11yProps(index: any) {
  return {
    id: `scrollable-auto-tab-${index}`,
    "aria-controls": `scrollable-auto-tabpanel-${index}`,
  };
}

function DataComponent(): ReactElement {
  const [audio, setAudio] = useState<any>();
  const [battery, setBattery] = useState<any>();
  const [bluetooth, setBluetooth] = useState<any>();
  const [cpu, setCpu] = useState<any>();
  const [display, setDisplay] = useState<any>();
  const [filesystem, setFilesystem] = useState<any>();
  const [graphics, setGraphics] = useState<any>();
  const [information, setInformation] = useState<any>();
  const [memory, setMemory] = useState<any>();
  const [network, setNetwork] = useState<any>();
  const [os, setOs] = useState<any>();
  const [processes, setProcesses] = useState<any>();
  const [system, setSystem] = useState<any>();
  const [usb, setUsb] = useState<any>();

  const [setup, setSetup] = useState<boolean>(false);
  const [settings] = useSettings();
  const [tab, setTab] = useState<number>(0);

  const handleChangeTab = (
    _event: React.ChangeEvent<any>,
    newValue: number
  ) => {
    setTab(newValue);
  };

  const query = useRouter().query;

  const eventHandler = useCallback(({ name, service, method, data }: Event) => {
    if (
      name.includes("data-") &&
      service &&
      services.findIndex((s: string) => s === service) > -1 &&
      method === "findAll" &&
      data
    ) {
      console.log("Data update:", name, service, data);
      switch (service) {
        case "audio":
          setAudio(data);
          break;
        case "battery":
          setBattery(data);
          break;
        case "bluetooth":
          setBluetooth(data);
          break;
        case "cpu":
          setCpu(data);
          break;
        case "display":
          setDisplay(data);
          break;
        case "filesystem":
          setFilesystem(data);
          break;
        case "graphics":
          setGraphics(data);
          break;
        case "information":
          setInformation(data);
          break;
        case "memory":
          setMemory(data);
          break;
        case "network":
          setNetwork(data);
          break;
        case "os":
          setOs(data);
          break;
        case "processes":
          setProcesses(data);
          break;
        case "system":
          setSystem(data);
          break;
        case "usb":
          setUsb(data);
          break;
        default:
          break;
      }
    }
  }, []);

  const handleSetup = useCallback(
    (wsPort: number, apiKey: string) => {
      console.log("Setup WebSocketConnection");
      const ws = new WebSocketConnection(wsPort, apiKey, true, async () => {
        ws.sendEvent({ name: "get-data", data: items });
      });
      ws.onEvent = eventHandler;
    },
    [eventHandler]
  );

  useEffect(() => {
    if (!setup && query && query.apiKey) {
      setSetup(true);
      handleSetup(Number(query.wsPort) || 9172, String(query.apiKey));
    }
  }, [setup, handleSetup, query]);

  const classes = useStyles();

  return (
    <>
      <Grid
        container
        className={classes.root}
        direction="column"
        spacing={2}
        alignItems="stretch"
      >
        {!settings ? (
          <Grid container direction="row" justifyContent="center">
            <CircularProgress />
          </Grid>
        ) : (
          <Grid container direction="row" item xs>
            <Grid item>
              <Tabs
                orientation="vertical"
                variant="scrollable"
                value={tab}
                onChange={handleChangeTab}
              >
                <Tab label="Audio" {...a11yProps(0)} />
                <Tab label="Battery" {...a11yProps(1)} />
                <Tab label="Bluetooth" {...a11yProps(2)} />
                <Tab label="CPU" {...a11yProps(3)} />
                <Tab label="Display" {...a11yProps(4)} />
                <Tab label="Filesystem" {...a11yProps(5)} />
                <Tab label="Graphics" {...a11yProps(6)} />
                <Tab label="Information" {...a11yProps(7)} />
                <Tab label="Memory" {...a11yProps(8)} />
                <Tab label="Network" {...a11yProps(9)} />
                <Tab label="OS" {...a11yProps(10)} />
                <Tab label="Processes" {...a11yProps(11)} />
                <Tab label="System" {...a11yProps(12)} />
                <Tab label="USB" {...a11yProps(13)} />
              </Tabs>
            </Grid>
            <Grid item xs>
              {tab === 0 ? (
                <DataItems name="Audio" data={audio} />
              ) : tab === 1 ? (
                <DataItems name="Battery" data={battery} />
              ) : tab === 2 ? (
                <DataItems name="Bluetooth" data={bluetooth} />
              ) : tab === 3 ? (
                <DataItems name="CPU" data={cpu} />
              ) : tab === 4 ? (
                <DataItems name="Display" data={display} />
              ) : tab === 5 ? (
                <DataItems name="Filesystem" data={filesystem} />
              ) : tab === 6 ? (
                <DataItems name="Graphics" data={graphics} />
              ) : tab === 7 ? (
                <DataItems name="Information" data={information} />
              ) : tab === 8 ? (
                <DataItems name="Memory" data={memory} />
              ) : tab === 9 ? (
                <DataItems name="Network" data={network} />
              ) : tab === 10 ? (
                <DataItems name="OS" data={os} />
              ) : tab === 11 ? (
                <DataItems name="Processes" data={processes} />
              ) : tab === 12 ? (
                <DataItems name="System" data={system} />
              ) : tab === 13 ? (
                <DataItems name="USB" data={usb} />
              ) : (
                ""
              )}
            </Grid>
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default DataComponent;
