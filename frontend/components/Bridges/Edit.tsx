import React, { ChangeEvent, ReactElement, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Theme,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { red } from "@mui/material/colors";
import { useRouter } from "next/dist/client/router";
import axios, { AxiosResponse } from "axios";
import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";

import { Bridge } from "../../assets/entities/bridge.entity";
import { Information } from "assets/entities/information.entity";

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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    delete: {
      marginLeft: 2,
      backgroundColor: red[600],
    },
    input: {
      margin: theme.spacing(1, 0),
    },
    testingMessage: {
      margin: theme.spacing(0, 1),
      flex: 1,
      textAlign: "right",
    },
  })
);
function BridgeEditComponent(props: BridgeEditProps): ReactElement {
  const [bridge, setBridge] = useState<Partial<Bridge>>(
    props.bridgeEdit.bridge
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
      `http://${query.apiHost || window.location.hostname}:${
        query.apiPort || 9170
      }/bridges/${bridge.key}`,
      { headers: { "api-key": query.apiKey as string } }
    );
    if (response && response.status < 400) props.handleClose();
    else setTestingMessage({ text: "Failed to delete bridge", error: true });
  }

  async function handleSave() {
    const information = await handleTestBridge();
    if (information && information.uuid) {
      const bridgeData = {
        ...bridge,
        key: information.uuid,
      };
      const url = `http://${query.apiHost || window.location.hostname}:${
        query.apiPort || 9170
      }/bridges`;
      console.log("Save:", { url, bridgeData });
      let response: AxiosResponse<Partial<Bridge>, any>;
      try {
        response = props.bridgeEdit.edit
          ? await axios.put<Partial<Bridge>>(
              `${url}/${bridge.key}`,
              bridgeData,
              {
                headers: { "api-key": query.apiKey as string },
              }
            )
          : await axios.post<Partial<Bridge>>(url, bridgeData, {
              headers: { "api-key": query.apiKey as string },
            });
      } catch (e) {
        console.error(e);
      }
      if (response && response.status < 400) props.handleClose();
      else setTestingMessage({ text: "Failed to save bridge", error: true });
    }
  }

  async function handleTestBridge(): Promise<Information | null> {
    setTestingMessage({ text: "Testing bridge..", error: false });
    try {
      const response = await axios.get<Information>(
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
        return response.data;
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
    return null;
  }

  const classes = useStyles();
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
          className={classes.input}
          autoFocus
          fullWidth
          id="name"
          label="Name"
          onChange={handleTextChanged("name")}
          type="text"
          value={bridge.name || ""}
          variant="outlined"
        />

        <TextField
          className={classes.input}
          fullWidth
          id="host"
          label="Host"
          onChange={handleTextChanged("host")}
          type="text"
          value={bridge.host || ""}
          variant="outlined"
        />

        <TextField
          className={classes.input}
          fullWidth
          id="port"
          label="Port"
          onChange={handleTextChanged("port")}
          type="number"
          value={bridge.port || 9170}
          variant="outlined"
        />

        <TextField
          className={classes.input}
          fullWidth
          id="apiKey"
          label="API Key"
          onChange={handleTextChanged("apiKey")}
          type="text"
          value={bridge.apiKey || ""}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button
          className={classes.delete}
          onClick={handleDelete}
          color="inherit"
          variant="contained"
        >
          Delete
        </Button>
        <Typography
          className={classes.testingMessage}
          color={testingMessage.error ? "error" : "textPrimary"}
          variant="subtitle2"
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
