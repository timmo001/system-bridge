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
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiMinusBoxOutline, mdiPlus } from "@mdi/js";
import _ from "lodash";

import { NameValue } from "assets/entities/types.entity";
import { SettingDescription } from "components/Settings/Settings";

interface NameValueAlias {
  name: string;
  value: string;
}

const nameValueMap: { [key: string]: NameValueAlias } = {
  additional_media_directories: {
    name: "Name",
    value: "Path",
  },
  keyboard_hotkeys: {
    name: "Hotkey",
    value: "Action",
  },
};

interface ItemListProps {
  id: string;
  setting: SettingDescription;
  listIn: Array<NameValue>;
  open: boolean;
  setOpen: (open: boolean) => void;
  handleChanged: (list: Array<NameValue>) => void;
}

function ItemList({
  id,
  setting,
  listIn,
  open,
  setOpen,
  handleChanged,
}: ItemListProps): ReactElement {
  const [list, setList] = useState<Array<NameValue>>([]);

  const { name, description, icon }: SettingDescription = setting;

  useEffect(() => {
    if (!open && listIn) setList(listIn);
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
                    label={nameValueMap[id]?.name || "Name"}
                    fullWidth
                    variant="outlined"
                    value={item.name}
                    onChange={(event) => {
                      const newList: Array<NameValue> = _.cloneDeep(list);
                      console.log("Update name:", key, newList, newList[key]);
                      if (newList && newList[key]) {
                        newList[key].name = event.target.value;
                        setList(newList);
                      }
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
                    label={nameValueMap[id]?.value || "Value"}
                    fullWidth
                    variant="outlined"
                    value={item.value}
                    onChange={(event) => {
                      const newList = _.cloneDeep(list);
                      console.log("Update value:", key, newList, newList[key]);
                      if (newList && newList[key]) {
                        newList[key].value = event.target.value;
                        setList(newList);
                      }
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
