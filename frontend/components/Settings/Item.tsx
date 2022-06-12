import React, { ChangeEvent, ReactElement, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Autocomplete,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemButton,
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
} from "@mdi/js";

import { handleCopyToClipboard } from "components/Common/Utils";
import { SettingDescription, settingsMap } from "components/Settings/Settings";
import { SettingsObject, SettingsValue } from "assets/entities/settings.entity";
import ItemList from "components/Settings/ItemList";
import { instanceOfNameValue, NameValue } from "assets/entities/types.entity";

interface ItemProps {
  keyIn: string;
  valueIn: SettingsValue;
  handleChanged: (key: string, value: SettingsValue) => void;
}

function Item({ keyIn, valueIn, handleChanged }: ItemProps): ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [value, setValue] = useState<SettingsValue>(valueIn);

  function handleSetSetting(valueIn: SettingsValue): void {
    setValue(valueIn);
  }

  function handleInputChanged(event: ChangeEvent<HTMLInputElement>): void {
    handleSetSetting(event.target.value);
  }

  function handleCheckedChanged(
    _event: ChangeEvent<HTMLInputElement>,
    checked: boolean
  ): void {
    handleSetSetting(checked);
  }

  function handleAutocompleteChanged(_event: any, value: string | null): void {
    if (value) handleSetSetting(value);
  }

  function handleGenerateApiKey(): void {
    handleSetSetting(uuidv4());
  }

  function handleClickShowPassword(): void {
    setShowPassword(!showPassword);
  }

  function handleMouseDownPassword(
    event: React.MouseEvent<HTMLButtonElement>
  ): void {
    event.preventDefault();
  }

  const valueChanged = useMemo(() => valueIn !== value, [valueIn, value]);

  const {
    name,
    description,
    icon,
    containerDisabled,
    isList,
    isPassword,
    minimum,
  }: SettingDescription = settingsMap[keyIn];

  const theme = useTheme();

  const ItemContainer = ({
    children,
  }: {
    children: ReactElement;
  }): ReactElement => {
    if (isList)
      return (
        <ListItemButton onClick={() => setOpen(true)}>
          {children}
        </ListItemButton>
      );
    return <ListItem>{children}</ListItem>;
  };

  return (
    <>
      <ItemContainer>
        <>
          <ListItemIcon>
            <Icon id="icon" title={name} size={1} path={icon} />
          </ListItemIcon>
          <ListItemText
            primary={name}
            secondary={description}
            sx={{ maxWidth: "64%", userSelect: "none" }}
          />
          <ListItemSecondaryAction sx={{ width: 420, textAlign: "end" }}>
            <Grid container alignItems="center" justifyContent="flex-end">
              <Grid item>
                {typeof value === "boolean" ? (
                  <Switch
                    edge="end"
                    disabled={containerDisabled}
                    checked={value}
                    onChange={handleCheckedChanged}
                  />
                ) : typeof valueIn === "string" && keyIn === "api_key" ? (
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
                            onClick={() => handleCopyToClipboard(String(value))}
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
                ) : typeof valueIn === "string" &&
                  typeof value === "string" &&
                  keyIn === "log_level" ? (
                  <Autocomplete
                    id={keyIn}
                    options={["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]}
                    renderInput={(params) => (
                      <TextField {...params} variant="outlined" />
                    )}
                    onChange={handleAutocompleteChanged}
                    sx={{ width: 210 }}
                    value={value}
                  />
                ) : typeof valueIn === "string" && isPassword ? (
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
                ) : typeof valueIn === "string" ? (
                  <TextField
                    type="text"
                    defaultValue={value}
                    disabled={containerDisabled}
                    onChange={handleInputChanged}
                    variant="outlined"
                  />
                ) : typeof valueIn === "number" ? (
                  <TextField
                    error={minimum ? Number(value) < minimum : false}
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
              </Grid>
              {isList ? (
                ""
              ) : (
                <Grid item>
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
                </Grid>
              )}
            </Grid>
          </ListItemSecondaryAction>
        </>
      </ItemContainer>
      {isList && Array.isArray(value) && instanceOfNameValue(value[0]) ? (
        <>
          <ItemList
            setting={settingsMap[keyIn]}
            listIn={value as unknown as Array<NameValue>}
            open={open}
            setOpen={setOpen}
            handleChanged={(newValue: Array<NameValue>) => {
              setValue(newValue);
              handleChanged(keyIn, newValue);
            }}
          />
        </>
      ) : (
        ""
      )}
    </>
  );
}

export default Item;
