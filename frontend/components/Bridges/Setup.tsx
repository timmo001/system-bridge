import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/dist/client/router";
import {
  CircularProgress,
  Container,
  createStyles,
  Grid,
  List,
  ListItem,
  ListItemText,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";
import axios from "axios";

import { Bridge } from "../../assets/entities/bridge.entity";
import { useSettings } from "../Contexts/Settings";
import BridgeEdit from "./Edit";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      margin: theme.spacing(2, 1.5, 6),
    },
  })
);

function BridgesSetupComponent(): ReactElement {
  const [bridgeEdit, setBridgeEdit] = useState<Bridge>();
  const [bridges, setBridges] = useState<Array<Bridge>>();
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
  }, [setup, handleSetup, query.apiKey, query.wsPort]);

  function handleItemClick(bridge: Bridge): void {
    setBridgeEdit(bridge);
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
                  onClick={() => handleItemClick(bridge)}
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
          </>
        )}
      </Container>
      {bridgeEdit ? (
        <BridgeEdit bridge={bridgeEdit} handleClose={handleBridgeEditClosed} />
      ) : (
        ""
      )}
    </>
  );
}

export default BridgesSetupComponent;
