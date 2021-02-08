import React, { ChangeEvent, ReactElement, useMemo } from "react";
import {
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
  TextField,
} from "@material-ui/core";
import Icon from "@mdi/react";

import {
  Configuration,
  ConfigurationItem,
  SettingsValue,
} from "../configuration";
import { SectionProps } from "./Section";
import { useSettings } from "./Utils";

interface ItemProps extends SectionProps {
  itemKey: string;
}

function Item({ sectionKey, itemKey }: ItemProps): ReactElement {
  const [settings, setSettings] = useSettings();
  const item: ConfigurationItem | undefined =
    settings?.[sectionKey].items[itemKey];

  function handleSetSetting(value: string | number | boolean) {
    console.log("handleSetSetting:", { sectionKey, itemKey, value });
    if (settings) {
      const newSettings: Configuration = settings;
      newSettings[sectionKey].items[itemKey].value = value;
      setSettings(newSettings);
      window.api.ipcRendererSend("update-setting", [
        `${sectionKey}-items-${itemKey}-value`,
        value,
      ]);
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

  if (!item) return <></>;
  const { name, defaultValue, description, icon }: ConfigurationItem = item;

  const value: SettingsValue = useMemo(
    () => (item.value === undefined ? defaultValue : item.value),
    [item.value]
  );

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
