import { ReactElement, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  useTheme,
} from "@mui/material";
import { Icon } from "@mdi/react";

import { SettingsObject } from "assets/entities/settings.entity";
import { mdiMinusBoxOutline, mdiPlus } from "@mdi/js";

interface ItemListProps {
  listIn: Array<SettingsObject>;
  open: boolean;
  setOpen: (open: boolean) => void;
  handleChanged: (list: Array<SettingsObject>) => void;
}

function ItemList({
  listIn,
  open,
  setOpen,
  handleChanged,
}: ItemListProps): ReactElement {
  const [list, setList] = useState<Array<SettingsObject>>(listIn);

  console.log("ItemList:", list);

  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{
        style: {
          background: theme.palette.background.paper,
        },
      }}
    >
      <DialogContent>
        <List sx={{ width: 540 }}>
          {list.map((item: any, key: number) => (
            <ListItem key={key}>
              <Grid container alignItems="center">
                <Grid
                  item
                  xs
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
                      const newList = [...list];
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
                      const newList = [...list];
                      if (newList && newList[key] !== null)
                        newList[key].value = event.target.value;
                      setList(newList);
                    }}
                    sx={{ width: 210 }}
                  />
                </Grid>
              </Grid>
              <Grid item>
                <IconButton
                  aria-label="Remove"
                  size="large"
                  onClick={() => {
                    setList(list.splice(key, 1));
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
            </ListItem>
          ))}
          <ListItemButton
            onClick={() => {
              const newList = [...list];
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
