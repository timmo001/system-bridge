import React, {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/dist/client/router";
import {
  Autocomplete,
  Button,
  AutocompleteRenderInputParams,
  CircularProgress,
  Container,
  Grid,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import axios from "axios";

import { Bridge } from "../../assets/entities/bridge.entity";
import { useSettings } from "../Contexts/Settings";

function BridgesOpenOnComponent(): ReactElement {
  const query = useRouter().query;

  const [bridges, setBridges] = useState<Array<Bridge>>();
  const [bridgeSelected, setBridgeSelected] = useState<Bridge>();
  const [settings] = useSettings();
  const [setup, setSetup] = useState<boolean>(false);
  const [url, setUrl] = useState<string>("");

  const handleSetup = useCallback(async () => {
    setUrl(query.url as string);
    const response = await axios.get<Array<Bridge>>(
      `http://${
        query.apiHost || typeof window !== "undefined"
          ? window.location.hostname
          : "localhost"
      }:${query.apiPort || 9170}/bridges`,
      { headers: { "api-key": query.apiKey as string } }
    );
    if (response && response.status < 400)
      setBridges(response.data.filter((bridge: Bridge) => bridge.apiKey));
  }, [query.apiHost, query.apiPort, query.apiKey, query.url]);

  function handleUrlChanged(event: ChangeEvent<HTMLInputElement>): void {
    setUrl(event.target.value);
  }

  async function handleOpenOn(): Promise<void> {
    if (bridgeSelected?.apiKey) {
      try {
        const response = await axios.post<{ path: string }>(
          `http://${bridgeSelected.host}:${bridgeSelected.port}/open`,
          { path: url },
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
  }, [setup, handleSetup, query]);

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
              sx={{ margin: theme.spacing(2, 1.5, 6) }}
            >
              Open URL On..
            </Typography>

            {bridges ? (
              <Autocomplete
                id="bridge"
                options={bridges}
                value={bridgeSelected}
                getOptionLabel={(option: Bridge) => option.name}
                renderInput={(params: AutocompleteRenderInputParams) => (
                  <TextField {...params} label="Bridge" variant="outlined" />
                )}
                onChange={(_event, value: Bridge | null) => {
                  if (value) setBridgeSelected(value);
                }}
                sx={{
                  margin: theme.spacing(2, 2.5),
                  width: "calc(100% - 32px)",
                }}
              />
            ) : (
              ""
            )}
            <TextField
              fullWidth
              id="url"
              label="URL"
              onChange={handleUrlChanged}
              type="url"
              value={url}
              variant="outlined"
              sx={{
                margin: theme.spacing(2, 2.5),
                width: "calc(100% - 32px)",
              }}
            />

            <Button
              color="primary"
              disabled={!bridgeSelected || !url}
              variant="contained"
              onClick={handleOpenOn}
              sx={{
                margin: theme.spacing(6, 2.5, 2),
                width: "calc(100% - 32px)",
              }}
            >
              Send
            </Button>
          </>
        )}
      </Container>
    </>
  );
}

export default BridgesOpenOnComponent;
