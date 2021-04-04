import React, {
  ChangeEvent,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  createStyles,
  FormControl,
  IconButton,
  Input,
  InputAdornment,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  makeStyles,
  Switch,
  TextField,
  Theme,
} from "@material-ui/core";
import Icon from "@mdi/react";
import { mdiCached, mdiContentCopy } from "@mdi/js";

import { Configuration, ConfigurationItem } from "../../../src/configuration";
import { SectionProps } from "./Section";
import { handleCopyToClipboard, useSettings } from "../Utils";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    button: {
      margin: theme.spacing(-1, -0.5),
    },
    secondaryAction: {
      width: 400,
      textAlign: "end",
    },
  })
);

interface ItemProps extends SectionProps {
  itemKey: string;
}

function Item({ sectionKey, itemKey }: ItemProps): ReactElement {
  const [settings, setSettings] = useSettings();

  const [originalItem, setOriginalItem] = useState<ConfigurationItem>();
  const [item, setItem] = useState<ConfigurationItem>();

  useEffect(() => {
    if (item === undefined) setItem(settings?.[sectionKey].items[itemKey]);
  }, [item, itemKey, sectionKey, settings]);

  useEffect(() => {
    if (originalItem === undefined && item) setOriginalItem(item);
  }, [originalItem, item]);

  function handleRestartServer() {
    if (process.env.NODE_ENV === "development")
      console.log("Restarting Server..");
    window.api.ipcRendererSend("restart-server");
  }

  function handleSetSetting(value: string | number | boolean) {
    if (typeof value !== "boolean" && !Number.isNaN(Number(value)))
      value = Number(value);
    console.log("handleSetSetting:", { sectionKey, itemKey, value });
    if (item) {
      setItem({ ...item, value });
      if (settings) {
        const newSettings: Configuration = settings;
        newSettings[sectionKey].items[itemKey].value = value;
        setSettings(newSettings);
        window.api.ipcRendererSend("update-setting", [
          `${sectionKey}-items-${itemKey}-value`,
          value,
        ]);
        window.api.ipcRendererOn("updated-setting", (_event, _args) => {
          if (item.requiresServerRestart) handleRestartServer();
        });
      }
    }
  }

  function handleChanged(event: ChangeEvent<HTMLInputElement>) {
    handleSetSetting(event.target.value);
  }

  function handleCheckedChanged(
    _event: ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) {
    handleSetSetting(checked);
  }

  function handleGenerateApiKey() {
    handleSetSetting(uuidv4());
  }

  const value = useMemo(() => {
    const value = item?.value === undefined ? item?.defaultValue : item.value;
    if (typeof item?.defaultValue === "boolean") return Boolean(value);
    if (typeof item?.defaultValue === "number") return Number(value);
    if (typeof item?.defaultValue === "string") return String(value);
    return value;
  }, [item?.value, item?.defaultValue]);

  const classes = useStyles();

  if (!item) return <></>;
  const { name, description, icon }: ConfigurationItem = item;

  return (
    <ListItem>
      <ListItemIcon>
        <Icon title={name} size={1} path={icon} />
      </ListItemIcon>
      <ListItemText primary={name} secondary={description} />
      <ListItemSecondaryAction className={classes.secondaryAction}>
        {typeof value === "boolean" ? (
          <Switch
            edge="end"
            defaultChecked={value}
            onChange={handleCheckedChanged}
          />
        ) : typeof value === "string" && itemKey === "apiKey" ? (
          <FormControl fullWidth>
            <Input
              type="text"
              disabled
              value={value}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    className={classes.button}
                    aria-label="Generate Api Key"
                    onClick={handleGenerateApiKey}
                    edge="end"
                  >
                    <Icon title="Generate API Key" size={1} path={mdiCached} />
                  </IconButton>
                  <IconButton
                    className={classes.button}
                    aria-label="Copy to clipboard"
                    onClick={() => handleCopyToClipboard(value)}
                  >
                    <Icon
                      title="Copy to clipboard"
                      size={0.8}
                      path={mdiContentCopy}
                    />
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
        ) : typeof value === "string" ? (
          <TextField
            type="text"
            defaultValue={value}
            onChange={handleChanged}
          />
        ) : typeof value === "number" ? (
          <TextField
            type="number"
            defaultValue={value}
            onChange={handleChanged}
          />
        ) : (
          ""
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default Item;
