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
} from "@material-ui/core";
import { useRouter } from "next/dist/client/router";
import axios from "axios";

import { Bridge } from "../../assets/entities/bridge.entity";

interface TestingMessage {
  text: string;
  error: boolean;
}

interface BridgeEditProps {
  bridge: Bridge;
  handleClose: () => void;
}

function BridgeEditComponent(props: BridgeEditProps): ReactElement {
  const [bridge, setBridge] = useState<Bridge>(props.bridge);
  const [testingMessage, setTestingMessage] = useState<TestingMessage>({
    text: "",
    error: false,
  });

  const query = useRouter().query;

  const handleTextChanged =
    (name: string) => (event: ChangeEvent<HTMLInputElement>) => {
      setBridge({ ...bridge, [name]: event.target.value });
    };

  function handleClose() {
    setTestingMessage({ text: "", error: false });
    props.handleClose();
  }

  async function handleSave() {
    if (await handleTestBridge()) {
      const response = await axios.put<Bridge>(
        `http://${query.apiHost || window.location.hostname}:${
          query.apiPort || 9170
        }/bridges/${bridge.key}`,
        bridge,
        {
          headers: { "api-key": query.apiKey as string },
        }
      );
      if (response && response.status < 400) props.handleClose();
      else setTestingMessage({ text: "Failed to save bridge", error: true });
    }
  }

  async function handleTestBridge(): Promise<boolean> {
    setTestingMessage({ text: "Testing bridge..", error: false });
    try {
      const response = await axios.get<Array<Bridge>>(
        `http://${bridge.host}:${bridge.port}/information`,
        {
          headers: { "api-key": bridge.apiKey },
        }
      );
      if (response && response.status < 400) {
        console.log("Information:", response.data);
        setTestingMessage({
          text: "Successfully connected to bridge.",
          error: false,
        });
        return true;
      }
      setTestingMessage({
        text: `Error testing bridge: ${response.status} - ${response.data}`,
        error: true,
      });
    } catch (e) {
      console.error("Error:", e);
      setTestingMessage({
        text: `Error testing bridge: ${e.message}`,
        error: true,
      });
    }
    return false;
  }

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      aria-labelledby="form-dialog-title"
      fullScreen={fullScreen}
      maxWidth="md"
      open
    >
      <DialogTitle id="form-dialog-title">Edit {bridge.name}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          id="name"
          label="Name"
          margin="dense"
          onChange={handleTextChanged("name")}
          type="text"
          value={bridge.name || ""}
        />
        <TextField
          fullWidth
          id="host"
          label="Host"
          margin="dense"
          onChange={handleTextChanged("host")}
          type="text"
          value={bridge.host || ""}
        />
        <TextField
          fullWidth
          id="port"
          label="Port"
          margin="dense"
          onChange={handleTextChanged("port")}
          type="number"
          value={bridge.port || 9170}
        />
        <TextField
          fullWidth
          id="apiKey"
          label="API Key"
          margin="dense"
          onChange={handleTextChanged("apiKey")}
          type="text"
          value={bridge.apiKey || ""}
        />
      </DialogContent>
      <DialogActions>
        <Typography
          color={testingMessage.error ? "error" : "textPrimary"}
          style={{ marginRight: theme.spacing(1) }}
          variant="subtitle2"
        >
          {testingMessage.text}
        </Typography>
        <Button
          autoFocus
          onClick={handleClose}
          color="default"
          variant="contained"
        >
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
