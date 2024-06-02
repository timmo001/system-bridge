"use client";
import {
  Fragment,
  ReactElement,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  CircularProgress,
  Grid,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { cloneDeep } from "lodash";
import Icon from "@mdi/react";

import {
  type ModuleData,
  type Modules,
  Module,
  moduleMap,
  modules,
} from "@/types/models";
import { type WebSocketResponse } from "@/types/websocket";
import { WebSocketConnection } from "@/utils/websocket";
import DataItems from "@/components/data/items";

let ws: WebSocketConnection;

function DataComponent(): ReactElement {
  const [data, setData] = useState<ModuleData>({});
  const [setup, setSetup] = useState<boolean>(false);
  const [tab, setTab] = useState<number>(0);

  const searchParams = useSearchParams();

  const handleChangeTab = (
    _event: React.ChangeEvent<any>,
    newValue: number
  ) => {
    setTab(newValue);
  };

  const eventHandler = useCallback((event: WebSocketResponse) => {
    console.log("New event:", event);
    if (event.type === "DATA_UPDATE")
      setData((oldData: ModuleData) => {
        const newData = cloneDeep(oldData);

        // Sort the data
        const data = event.data as Record<string, any>;
        let sortedData: Record<string, any> = {};
        Object.keys(data)
          .sort()
          .forEach((key: string) => {
            sortedData[key] = data[key];
          });

        newData[event.module as Module] = sortedData as Modules;

        return newData;
      });
  }, []);

  const handleSetup = useCallback(
    (host: string, port: number, token: string) => {
      console.log("Setup WebSocketConnection");
      ws = new WebSocketConnection(host, port, token, async () => {
        ws.getData(modules);
        ws.registerDataListener(modules);
      });
      ws.onEvent = (e: Event) => eventHandler(e as WebSocketResponse);
    },
    [eventHandler]
  );

  useEffect(() => {
    if (!setup && searchParams) {
      const apiHost = searchParams.get("apiHost");
      const apiPort = searchParams.get("apiPort");
      const token = searchParams.get("token");

      console.log({ apiHost, apiPort, token });

      if (apiHost && apiPort && token) {
        setSetup(true);
        handleSetup(apiHost, Number(apiPort), token);
      }
    }
  }, [setup, handleSetup, searchParams]);

  console.log("Data:", data);

  const theme = useTheme();
  const mobileLayout = useMediaQuery(theme.breakpoints.down("md"));
  return (
    <>
      <Tabs
        allowScrollButtonsMobile
        centered={mobileLayout ? false : true}
        onChange={handleChangeTab}
        scrollButtons="auto"
        variant={mobileLayout ? "scrollable" : "fullWidth"}
        value={tab}
        sx={{ marginBottom: theme.spacing(2) }}
      >
        {modules.map((module: string, index: number) => (
          <Tab
            icon={<Icon path={moduleMap[module].icon} size={1} />}
            key={index}
            label={moduleMap[module].name}
            sx={{ minWidth: "auto" }}
          />
        ))}
      </Tabs>
      <Grid
        container
        alignItems="stretch"
        direction="column"
        spacing={2}
        sx={{ padding: theme.spacing(2) }}
      >
        <Grid item xs>
          {modules.map((module: string, index: number) => (
            <Fragment key={index}>
              {tab === index ? (
                <>
                  {data[module as Module] ? (
                    <DataItems
                      title={moduleMap[module].name}
                      data={data[module as Module] as Modules}
                    />
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
            </Fragment>
          ))}
        </Grid>
      </Grid>
    </>
  );
}

function DataComponentContainer(): ReactElement {
  return (
    <Suspense>
      <DataComponent />
    </Suspense>
  );
}

export default DataComponentContainer;
