import React, { ChangeEvent, ReactElement, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
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
  useTheme,
} from "@mui/material";
import { Icon } from "@mdi/react";
import {
  mdiCached,
  mdiContentCopy,
  mdiContentSaveOutline,
  mdiEye,
  mdiEyeOff,
  mdiTextBoxOutline,
  mdiWebBox,
} from "@mdi/js";

import { handleCopyToClipboard } from "components/Common/Utils";
import { SettingsValue } from "assets/entities/settings.entity";

interface SettingDescription {
  name: string;
  description: string;
  icon: string;
  containerDisabled?: boolean;
  isPassword?: boolean;
  minimum?: number;
}

const settingsMap: { [key: string]: SettingDescription } = {
  log_level: {
    name: "Log Level",
    description: "Log level for the application",
    icon: mdiTextBoxOutline,
  },
  port_api: {
    name: "API Port",
    description: "Port for the API and WebSocket",
    icon: mdiWebBox,
  },
};

interface ItemProps {
  keyIn: string;
  valueIn: SettingsValue;
  handleChanged: (key: string, value: SettingsValue) => void;
}

function Item({ keyIn, valueIn, handleChanged }: ItemProps): ReactElement {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [value, setValue] = useState<SettingsValue>(valueIn);

  function handleSetSetting(valueIn: SettingsValue): void {
    setValue(valueIn);
  }

  function handleInputChanged(event: ChangeEvent<HTMLInputElement>) {
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

  const valueChanged = useMemo(() => valueIn !== value, [valueIn, value]);

  const {
    name,
    description,
    icon,
    containerDisabled,
    isPassword,
    minimum,
  }: SettingDescription = settingsMap[keyIn];

  const theme = useTheme();

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
            disabled={containerDisabled}
            defaultChecked={value}
            onChange={handleCheckedChanged}
          />
        ) : typeof value === "string" && keyIn === "api_key" ? (
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
        ) : typeof value === "string" && isPassword ? (
          <FormControl variant="outlined">
            <OutlinedInput
              type={showPassword ? "text" : "password"}
              defaultValue={value}
              onChange={handleInputChanged}
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
            disabled={containerDisabled}
            onChange={handleInputChanged}
            variant="outlined"
          />
        ) : typeof value === "number" ? (
          <TextField
            error={minimum ? value < minimum : false}
            type="number"
            disabled={containerDisabled}
            inputProps={{ minimum: minimum }}
            defaultValue={value}
            onChange={handleInputChanged}
            variant="outlined"
          />
        ) : (
          ""
        )}
        <IconButton
          disabled={valueChanged === false}
          onClick={() => {
            handleChanged(keyIn, value);
          }}
          sx={{ margin: theme.spacing(1) }}
        >
          <Icon
            id="save"
            title="Save"
            size={1}
            path={mdiContentSaveOutline}
            style={{ opacity: valueChanged ? 1 : 0.25 }}
          />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default Item;
