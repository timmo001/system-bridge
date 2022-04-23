import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  CircularProgress,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import axios from "axios";

import { Bridge } from "../../assets/entities/bridge.entity";
import { useSettings } from "../Contexts/Settings";
import BridgeEdit, { EditBridge } from "./Edit";

const DEFAULT_BRIDGE: Partial<Bridge> = {
  port: 9170,
};

function BridgesSetupComponent(): ReactElement {
  const [bridgeEdit, setBridgeEdit] = useState<EditBridge>();
  const [bridges, setBridges] = useState<Array<Bridge>>();
  const [settings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);

  const query = useRouter().query;

  const handleSetup = useCallback(async () => {
    console.log("Setup Bridges");
    const response = await axios.get<Array<Bridge>>(
      `http://${
        query.apiHost || typeof window !== "undefined"
          ? window.location.hostname
          : "localhost"
      }:${query.apiPort || 9170}/bridges`,
      {
        headers: { "api-key": query.apiKey as string },
      }
    );
    if (response && response.status < 400) {
      setBridges(response.data);
    }
  }, [query.apiHost, query.apiPort, query.apiKey]);

  useEffect(() => {
    if (!setup && query && query.apiKey) {
      setSetup(true);
      handleSetup();
    }
  }, [setup, handleSetup, query]);

  function handleItemClick(bridge: Partial<Bridge>, edit: boolean): void {
    setBridgeEdit({ bridge: bridge, edit: edit });
  }

  async function handleBridgeEditClosed(): Promise<void> {
    setSetup(true);
    await handleSetup();
    setBridgeEdit(undefined);
  }

  const theme = useTheme();

  return (
    <>
      <Container maxWidth="lg">
        {!settings && !bridges ? (
          <Grid
            container
            direction="row"
            justifyContent="center"
            sx={{ margin: theme.spacing(10, 0, 8) }}
          >
            <CircularProgress />
          </Grid>
        ) : (
          <>
            <Typography
              component="h2"
              variant="h3"
              sx={{
                margin: theme.spacing(2, 1.5, 6),
              }}
            >
              Bridges
            </Typography>
            {bridges ? (
              <List>
                {bridges.map((bridge: Bridge) => (
                  <ListItem
                    key={bridge.key}
                    button
                    onClick={() => handleItemClick(bridge, true)}
                  >
                    <ListItemText
                      primary={`${bridge.name} ${
                        bridge.apiKey ? "" : "(Not Configured)"
                      }`}
                      secondary={`${bridge.host}:${bridge.port}`}
                      color={bridge.apiKey ? "primary" : "error"}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              ""
            )}
            <ListItem
              button
              onClick={() => handleItemClick(DEFAULT_BRIDGE, false)}
            >
              <ListItemText
                primary="Add Bridge"
                secondary="Add a new bridge"
                color="primary"
              />
            </ListItem>
          </>
        )}
      </Container>
      {bridgeEdit ? (
        <BridgeEdit
          bridgeEdit={bridgeEdit}
          handleClose={handleBridgeEditClosed}
        />
      ) : (
        ""
      )}
    </>
  );
}

export default BridgesSetupComponent;
