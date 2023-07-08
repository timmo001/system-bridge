import React, { ChangeEvent, ReactElement, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/router";
import axios, { AxiosResponse } from "axios";

import { Bridge } from "../../assets/entities/bridge.entity";
import { System } from "assets/entities/system.entity";

export interface EditBridge {
  edit: boolean;
  bridge: Partial<Bridge>;
}

interface TestingMessage {
  text: string;
  error: boolean;
}

interface BridgeEditProps {
  bridgeEdit: EditBridge;
  handleClose: () => void;
}

function BridgeEditComponent(props: BridgeEditProps): ReactElement {
  const [bridge, setBridge] = useState<Partial<Bridge>>(
    props.bridgeEdit.bridge,
  );
  const [testingMessage, setTestingMessage] = useState<TestingMessage>({
    text: "",
    error: false,
  });

  const query = useRouter().query;

  const handleTextChanged =
    (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
      setBridge({ ...bridge, [name]: event.target.value });
    };

  function handleClose(): void {
    setTestingMessage({ text: "", error: false });
    props.handleClose();
  }

  async function handleDelete(): Promise<void> {
    const response = await axios.delete(
      `http://${
        query.apiHost || typeof window !== "undefined"
          ? window.location.hostname
          : "localhost"
      }:${query.apiPort || 9170}/api/remote/${bridge.key}`,
      { headers: { "api-key": query.apiKey as string } },
    );
    if (response && response.status < 400) props.handleClose();
    else setTestingMessage({ text: "Failed to delete bridge", error: true });
  }

  async function handleSave() {
    const system = await handleTestBridge();
    if (system && system.uuid) {
      const bridgeData = {
        ...bridge,
        key: system.uuid,
      };
      const url = `http://${
        query.apiHost || typeof window !== "undefined"
          ? window.location.hostname
          : "localhost"
      }:${query.apiPort || 9170}/api/remote`;
      console.log("Save:", { url, bridgeData });
      let response: AxiosResponse<Partial<Bridge>, any>;
      try {
        response = props.bridgeEdit.edit
          ? await axios.put<Partial<Bridge>>(
              `${url}/${bridge.key}`,
              bridgeData,
              {
                headers: { "api-key": query.apiKey as string },
              },
            )
          : await axios.post<Partial<Bridge>>(url, bridgeData, {
              headers: { "api-key": query.apiKey as string },
            });
        if (response && response.status < 400) props.handleClose();
        else setTestingMessage({ text: "Failed to save bridge", error: true });
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function handleTestBridge(): Promise<System | null> {
    setTestingMessage({ text: "Testing bridge..", error: false });
    if (bridge?.api_key)
      try {
        const response = await axios.get<System>(
          `http://${bridge.host}:${bridge.port}/api/data/system`,
          {
            headers: { "api-key": bridge.api_key },
          },
        );
        if (response && response.status < 400) {
          console.log("System:", response.data);
          setTestingMessage({
            text: "Successfully connected to bridge.",
            error: false,
          });
          return response.data;
        }
        setTestingMessage({
          text: `Error testing bridge: ${response.status} - ${response.data}`,
          error: true,
        });
      } catch (e: any) {
        console.error("Error:", e);
        setTestingMessage({
          text: `Error testing bridge: ${e.message}`,
          error: true,
        });
      }
    return null;
  }

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("lg"));

  return (
    <Dialog
      aria-labelledby="form-dialog-title"
      fullScreen={fullScreen}
      maxWidth="md"
      open
    >
      <DialogTitle id="form-dialog-title">
        {props.bridgeEdit.edit ? "Edit" : ""} {bridge.name}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          id="name"
          label="Name"
          onChange={handleTextChanged("name")}
          type="text"
          value={bridge.name || ""}
          variant="outlined"
          sx={{ margin: theme.spacing(1, 0) }}
        />

        <TextField
          fullWidth
          id="host"
          label="Host"
          onChange={handleTextChanged("host")}
          type="text"
          value={bridge.host || ""}
          variant="outlined"
          sx={{ margin: theme.spacing(1, 0) }}
        />

        <TextField
          fullWidth
          id="port"
          label="Port"
          onChange={handleTextChanged("port")}
          type="number"
          value={bridge.port || 9170}
          variant="outlined"
          sx={{ margin: theme.spacing(1, 0) }}
        />

        <TextField
          fullWidth
          id="api_key"
          label="API Key"
          onChange={handleTextChanged("api_key")}
          type="text"
          value={bridge.api_key || ""}
          variant="outlined"
          sx={{ margin: theme.spacing(1, 0) }}
        />
      </DialogContent>
      <DialogActions
        sx={{
          padding: theme.spacing(0, 2, 1),
        }}
      >
        <Button
          disabled={bridge.key === undefined}
          onClick={handleDelete}
          color="error"
          variant="contained"
          sx={{ margin: theme.spacing(1, 0) }}
        >
          Delete
        </Button>
        <Typography
          color={testingMessage.error ? "error" : "textPrimary"}
          variant="subtitle2"
          sx={{
            margin: theme.spacing(0, 1),
            flex: 1,
            textAlign: "right",
          }}
        >
          {testingMessage.text}
        </Typography>
        <Button autoFocus onClick={handleClose} variant="contained">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default BridgeEditComponent;
