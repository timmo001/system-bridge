import React, {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/dist/client/router";
import {
  Button,
  CircularProgress,
  Container,
  createStyles,
  Grid,
  makeStyles,
  TextField,
  Theme,
  Typography,
} from "@material-ui/core";
import { Autocomplete, AutocompleteRenderInputParams } from "@material-ui/lab";
import axios from "axios";

import { Bridge } from "../../assets/entities/bridge.entity";
import { useSettings } from "../Contexts/Settings";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      margin: theme.spacing(2, 1.5, 1),
    },
    subtitle: {
      margin: theme.spacing(1, 2, 2),
    },
    input: {
      margin: theme.spacing(2, 2.5),
      width: "calc(100% - 32px)",
    },
    button: {
      margin: theme.spacing(4, 2.5, 1.5),
      width: "calc(100% - 32px)",
    },
  })
);

function BridgesSendToComponent(): ReactElement {
  const query = useRouter().query;

  const [bridges, setBridges] = useState<Array<Bridge>>();
  const [bridgeSelected, setBridgeSelected] = useState<Bridge>();
  const [settings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);
  const [url, setUrl] = useState<string>("");

  const handleSetup = useCallback(async () => {
    console.log("Setup SendTo");
    setUrl(query.url as string);
    const response = await axios.get<Array<Bridge>>(
      `http://${query.apiHost || window.location.hostname}:${
        query.apiPort || 9170
      }/bridges`,
      { headers: { "api-key": query.apiKey as string } }
    );
    if (response && response.status < 400)
      setBridges(response.data.filter((bridge: Bridge) => bridge.apiKey));
  }, [query.apiHost, query.apiPort, query.apiKey]);

  function handleUrlChanged(event: ChangeEvent<HTMLInputElement>): void {
    setUrl(event.target.value);
  }

  async function handleSendTo(): Promise<void> {
    if (bridgeSelected) {
      try {
        const response = await axios.post<{ path: string }>(
          `http://${bridgeSelected.host}:${bridgeSelected.port}/open`,
          { path: query.url },
          { headers: { "api-key": bridgeSelected.apiKey } }
        );
        if (response && response.status < 400) {
          console.log(response.data);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  useEffect(() => {
    if (!setup && query && query.apiKey) {
      setSetup(true);
      handleSetup();
    }
  }, [setup, handleSetup, query.apiKey, query.wsPort]);

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
              Send to Bridge..
            </Typography>

            <Autocomplete
              className={classes.input}
              id="bridge"
              options={bridges}
              value={bridgeSelected}
              getOptionLabel={(option: Bridge) => option.name}
              renderInput={(params: AutocompleteRenderInputParams) => (
                <TextField {...params} label="Bridge" variant="outlined" />
              )}
              onChange={(_event: ChangeEvent, value: Bridge) =>
                setBridgeSelected(value)
              }
            />

            <TextField
              className={classes.input}
              fullWidth
              id="url"
              label="URL"
              onChange={handleUrlChanged}
              type="url"
              value={url}
              variant="outlined"
            />

            <Button
              className={classes.button}
              color="primary"
              disabled={!bridgeSelected || !url}
              variant="contained"
              onClick={handleSendTo}
            >
              Send
            </Button>
          </>
        )}
      </Container>
    </>
  );
}

export default BridgesSendToComponent;
