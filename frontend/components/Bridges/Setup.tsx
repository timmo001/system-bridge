import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/dist/client/router";
import {
  CircularProgress,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
  Theme,
  Typography,
} from "@mui/material";
import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";
import axios from "axios";

import { Bridge } from "../../assets/entities/bridge.entity";
import { useSettings } from "../Contexts/Settings";
import BridgeEdit, { EditBridge } from "./Edit";

const DEFAULT_BRIDGE: Partial<Bridge> = {
  port: 9170,
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      margin: theme.spacing(2, 1.5, 6),
    },
  })
);

function BridgesSetupComponent(): ReactElement {
  const [bridgeEdit, setBridgeEdit] = useState<EditBridge>();
  const [bridges, setBridges] = useState<Array<Partial<Bridge>>>();
  const [settings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);

  const query = useRouter().query;

  const handleSetup = useCallback(async () => {
    console.log("Setup Bridges");
    const response = await axios.get<Array<Bridge>>(
      `http://${query.apiHost || window.location.hostname}:${
        query.apiPort || 9170
      }/bridges`,
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

  const classes = useStyles();

  return (
    <>
      <Container maxWidth="lg">
        {!settings && !bridges ? (
          <Grid container direction="row" justifyContent="center">
            <CircularProgress />
          </Grid>
        ) : (
          <>
            <Typography className={classes.title} component="h2" variant="h3">
              Bridges
            </Typography>

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
