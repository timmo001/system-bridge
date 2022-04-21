import React, {
  ChangeEvent,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/dist/client/router";
import { v4 as uuidv4 } from "uuid";
import {
  FormControl,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  OutlinedInput,
  Switch,
  TextField,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiCached, mdiContentCopy, mdiEye, mdiEyeOff } from "@mdi/js";
import axios from "axios";

import {
  Configuration,
  ConfigurationItem,
} from "../../assets/entities/configuration.entity";
import { handleCopyToClipboard } from "../Common/Utils";
import { SectionProps } from "./Section";
import { Setting } from "../../assets/entities/settings.entity";
import { useInformation } from "components/Contexts/Information";
import { useSettings } from "../Contexts/Settings";

interface ItemProps extends SectionProps {
  itemKey: string;
}

function Item({
  sectionKey,
  itemKey,
  handleServerRestartRequired,
}: ItemProps): ReactElement {
  const [information] = useInformation();
  const [settings, setSettings] = useSettings();

  const query = useRouter().query;

  const [originalItem, setOriginalItem] = useState<ConfigurationItem>();
  const [item, setItem] = useState<ConfigurationItem>();
  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  useEffect(() => {
    if (item === undefined) setItem(settings?.[sectionKey].items[itemKey]);
  }, [item, itemKey, sectionKey, settings]);

  useEffect(() => {
    if (originalItem === undefined && item) setOriginalItem(item);
  }, [originalItem, item]);

  function handleSetSetting(valueIn: string | number | boolean) {
    if (typeof valueIn !== "boolean" && !Number.isNaN(Number(valueIn)))
      valueIn = Number(valueIn);
    console.log("handleSetSetting:", { sectionKey, itemKey, value: valueIn });
    if (item) {
      setItem({ ...item, value: valueIn });
      if (settings) {
        const newSettings: Configuration = settings;
        newSettings[sectionKey].items[itemKey].value = valueIn;
        setSettings(newSettings);
        axios.put<Setting>(
          `http://${
            query.apiHost || typeof window !== "undefined"
              ? window.location.hostname
              : "localhost"
          }:${query.apiPort || 9170}/settings/${sectionKey}-${itemKey}`,
          {
            value: String(valueIn),
          },
          {
            headers: { "api-key": query.apiKey as string },
          }
        );
        if (newSettings[sectionKey].items[itemKey].requiresServerRestart)
          handleServerRestartRequired();
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

  function handleClickShowPassword() {
    setShowPassword(!showPassword);
  }

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const value = useMemo(() => {
    const value = item?.value === undefined ? item?.defaultValue : item.value;
    if (typeof item?.defaultValue === "boolean") return Boolean(value);
    if (typeof item?.defaultValue === "number") return Number(value);
    if (typeof item?.defaultValue === "string") return String(value);
    return value;
  }, [item?.value, item?.defaultValue]);

  if (!item) return <></>;
  const { name, description, icon, containerDisabled }: ConfigurationItem =
    item;

  return (
    <ListItem>
      <ListItemIcon>
        <Icon id="icon" title={name} size={1} path={icon} />
      </ListItemIcon>
      <ListItemText
        style={{ maxWidth: "64%" }}
        primary={name}
        secondary={description}
        sx={{ userSelect: "none" }}
      />
      <ListItemSecondaryAction sx={{ width: 420, textAlign: "end" }}>
        {typeof value === "boolean" ? (
          <Switch
            edge="end"
            disabled={information?.container && containerDisabled}
            defaultChecked={value}
            onChange={handleCheckedChanged}
          />
        ) : typeof value === "string" && itemKey === "apiKey" ? (
          <FormControl fullWidth variant="outlined">
            <OutlinedInput
              type="text"
              disabled
              value={value}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Generate Api Key"
                    onClick={handleGenerateApiKey}
                    edge="end"
                    size="large"
                    sx={{ margin: theme.spacing(-1, -0.5) }}
                  >
                    <Icon
                      id="generate-api-key"
                      title="Generate API Key"
                      size={1}
                      path={mdiCached}
                    />
                  </IconButton>
                  <IconButton
                    aria-label="Copy to clipboard"
                    onClick={() => handleCopyToClipboard(value)}
                    size="large"
                    sx={{ margin: theme.spacing(-1, -0.5) }}
                  >
                    <Icon
                      id="copy-to-clipboard"
                      title="Copy to clipboard"
                      size={0.8}
                      path={mdiContentCopy}
                    />
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
        ) : typeof value === "string" && item.isPassword ? (
          <FormControl variant="outlined">
            <OutlinedInput
              type={showPassword ? "text" : "password"}
              defaultValue={value}
              onChange={handleChanged}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Toggle visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    size="large"
                  >
                    <Icon
                      id="copy-to-clipboard"
                      title="Copy to clipboard"
                      size={0.8}
                      path={showPassword ? mdiEye : mdiEyeOff}
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
            disabled={information?.container && containerDisabled}
            onChange={handleChanged}
            variant="outlined"
          />
        ) : typeof value === "number" ? (
          <TextField
            error={item.minimum ? value < item.minimum : false}
            type="number"
            disabled={information?.container && containerDisabled}
            inputProps={{ minimum: item.minimum }}
            defaultValue={value}
            onChange={handleChanged}
            variant="outlined"
          />
        ) : (
          ""
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default Item;
