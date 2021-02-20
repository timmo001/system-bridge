import React, {
  ChangeEvent,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
  TextField,
} from "@material-ui/core";
import Icon from "@mdi/react";

import { Configuration, ConfigurationItem } from "../../../src/configuration";
import { SectionProps } from "./Section";
import { useSettings } from "../Utils";

interface ItemProps extends SectionProps {
  itemKey: string;
}

function Item({ sectionKey, itemKey }: ItemProps): ReactElement {
  const [settings, setSettings] = useSettings();
  const item: ConfigurationItem | undefined =
    settings?.[sectionKey].items[itemKey];

  const [originalItem, setOriginalItem] = useState<ConfigurationItem>();

  useEffect(() => {
    if (!originalItem && item) setOriginalItem(item);
  }, [originalItem, item]);

  function handleRestartServer() {
    if (process.env.NODE_ENV === "development")
      console.log("Restarting Server..");
    window.api.ipcRendererSend("restart-server");
  }

  function handleSetSetting(value: string | number | boolean) {
    if (!Number.isNaN(Number(value))) value = Number(value);
    console.log("handleSetSetting:", { sectionKey, itemKey, value });
    if (settings) {
      const newSettings: Configuration = settings;
      newSettings[sectionKey].items[itemKey].value = value;
      setSettings(newSettings);
      window.api.ipcRendererSend("update-setting", [
        `${sectionKey}-items-${itemKey}-value`,
        value,
      ]);
      window.api.ipcRendererOn("updated-setting", (_event, _args) => {
        if (settings[sectionKey].items[itemKey].requiresServerRestart)
          handleRestartServer();
      });
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

  const value = useMemo(() => {
    const value = item?.value === undefined ? item?.defaultValue : item.value;
    if (typeof item?.defaultValue === "boolean") return Boolean(value);
    if (typeof item?.defaultValue === "number") return Number(value);
    if (typeof item?.defaultValue === "string") return String(value);
    return value;
  }, [item?.value, item?.defaultValue]);

  if (!item) return <></>;
  const { name, description, icon }: ConfigurationItem = item;

  return (
    <ListItem>
      <ListItemIcon>
        <Icon title={name} size={1} path={icon} />
      </ListItemIcon>
      <ListItemText primary={name} secondary={description} />
      <ListItemSecondaryAction>
        {typeof value === "boolean" ? (
          <Switch
            edge="end"
            defaultChecked={value}
            onChange={handleCheckedChanged}
          />
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
