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
import { mdiCached, mdiContentCopy, mdiEye, mdiEyeOff } from "@mdi/js";
import axios from "axios";
import Icon from "@mdi/react";

import {
  Configuration,
  ConfigurationItem,
} from "../../assets/entities/configuration.entity";
import { handleCopyToClipboard } from "../Common/Utils";
import { SectionProps } from "./Section";
import { Setting } from "../../assets/entities/settings.entity";
import { useInformation } from "components/Contexts/Information";
import { useSettings } from "../Contexts/Settings";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    button: {
      margin: theme.spacing(-1, -0.5),
    },
    disabled: {
      userSelect: "none",
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
        axios.put<Setting>(
          `http://${query.apiHost || window.location.hostname}:${
            query.apiPort || 9170
          }/settings/${sectionKey}-${itemKey}`,
          {
            value: String(value),
          },
          {
            headers: { "api-key": query.apiKey },
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

  const classes = useStyles();

  if (!item) return <></>;
  const { name, description, icon, containerDisabled }: ConfigurationItem =
    item;

  return (
    <ListItem>
      <ListItemIcon>
        <Icon title={name} size={1} path={icon} />
      </ListItemIcon>
      <ListItemText
        className={classes.disabled}
        style={{ maxWidth: "74%" }}
        primary={name}
        secondary={description}
      />
      <ListItemSecondaryAction className={classes.secondaryAction}>
        {typeof value === "boolean" ? (
          <Switch
            edge="end"
            disabled={information?.container && containerDisabled}
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
        ) : typeof value === "string" && item.isPassword ? (
          <FormControl>
            <Input
              type={showPassword ? "text" : "password"}
              defaultValue={value}
              onChange={handleChanged}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Toggle visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                  >
                    <Icon
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
          />
        ) : typeof value === "number" ? (
          <TextField
            error={item.minimum ? value < item.minimum : false}
            type="number"
            disabled={information?.container && containerDisabled}
            inputProps={{ minimum: item.minimum }}
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
