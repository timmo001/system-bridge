import {
  Fragment,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";
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
} from "types/models";
import { type WebSocketResponse } from "types/websocket";
import { WebSocketConnection } from "components/Common/WebSocket";
import DataItems from "components/Data/DataItems";

function DataComponent(): ReactElement {
  const [data, setData] = useState<ModuleData>({});
  const [setup, setSetup] = useState<boolean>(false);
  const [tab, setTab] = useState<number>(0);

  const query = useRouter().query;

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
    (port: number, token: string) => {
      console.log("Setup WebSocketConnection");
      const ws = new WebSocketConnection(port, token, async () => {
        ws.getData(modules);
        ws.registerDataListener(modules);
      });
      ws.onEvent = (e: Event) => eventHandler(e as WebSocketResponse);
    },
    [eventHandler]
  );

  useEffect(() => {
    if (!setup && query && query.token) {
      setSetup(true);
      handleSetup(Number(query.apiPort) || 9170, String(query.token));
    }
  }, [setup, handleSetup, query]);

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

export default DataComponent;
