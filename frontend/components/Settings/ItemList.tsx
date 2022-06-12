import { ReactElement, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  useMediaQuery,
  useTheme,
  useThemeProps,
} from "@mui/material";
import { Icon } from "@mdi/react";
import _ from "lodash";

import { SettingsObject } from "assets/entities/settings.entity";
import { mdiMinusBoxOutline, mdiPlus } from "@mdi/js";
import { SettingDescription } from "./Settings";

interface ItemListProps {
  setting: SettingDescription;
  listIn: Array<SettingsObject>;
  open: boolean;
  setOpen: (open: boolean) => void;
  handleChanged: (list: Array<SettingsObject>) => void;
}

function ItemList({
  setting,
  listIn,
  open,
  setOpen,
  handleChanged,
}: ItemListProps): ReactElement {
  const [list, setList] = useState<Array<SettingsObject>>(listIn);

  const { name, description, icon }: SettingDescription = setting;

  useEffect(() => {
    if (!open) setList(listIn);
  }, [listIn, open]);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Dialog
      fullScreen={fullScreen}
      fullWidth
      maxWidth="lg"
      open={open}
      scroll="paper"
      PaperProps={{
        style: {
          background: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle>
        <Icon
          id="copy-to-clipboard"
          title="Copy to clipboard"
          size={0.7}
          path={icon}
          style={{ marginRight: theme.spacing(1) }}
        />
        {name}
      </DialogTitle>
      <DialogContentText sx={{ margin: theme.spacing(0, 3) }}>
        {description}
      </DialogContentText>
      <DialogContent>
        <List>
          {list.map((item: any, key: number) => (
            <ListItem key={key}>
              <Grid container alignItems="center">
                <Grid
                  item
                  xs={4}
                  sx={{
                    marginRight: theme.spacing(1),
                  }}
                >
                  <TextField
                    id="name"
                    label="Name"
                    fullWidth
                    variant="outlined"
                    value={item.name}
                    onChange={(event) => {
                      const newList = _.cloneDeep(list);
                      if (newList && newList[key] !== null)
                        newList[key].name = event.target.value;
                      setList(newList);
                    }}
                  />
                </Grid>
                <Grid
                  item
                  xs
                  sx={{
                    marginLeft: theme.spacing(1),
                  }}
                >
                  <TextField
                    id="value"
                    label="Value"
                    fullWidth
                    variant="outlined"
                    value={item.value}
                    onChange={(event) => {
                      const newList = _.cloneDeep(list);
                      if (newList && newList[key] !== null)
                        newList[key].value = event.target.value;
                      setList(newList);
                    }}
                  />
                </Grid>
                <Grid item>
                  <IconButton
                    aria-label="Remove"
                    size="large"
                    onClick={() => {
                      const newList = _.cloneDeep(list);
                      newList.splice(key, 1);
                      setList(newList);
                    }}
                  >
                    <Icon
                      id="remove-item"
                      title="Remove"
                      size={0.8}
                      path={mdiMinusBoxOutline}
                    />
                  </IconButton>
                </Grid>
              </Grid>
            </ListItem>
          ))}
          <ListItemButton
            onClick={() => {
              const newList = _.cloneDeep(list);
              newList.push({ name: "", value: "" });
              setList(newList);
            }}
          >
            <ListItemIcon>
              <Icon id="add" title="Add" size={1} path={mdiPlus} />
            </ListItemIcon>
            <ListItemText primary="Add" secondary="Add a new item" />
          </ListItemButton>
        </List>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpen(false);
          }}
          color="primary"
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            setOpen(false);
            handleChanged(list);
          }}
          color="primary"
          variant="outlined"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ItemList;
