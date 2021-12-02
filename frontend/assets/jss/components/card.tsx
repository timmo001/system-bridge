import { Theme } from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";

const cardStyle = makeStyles((theme: Theme) => ({
  button: {
    height: `calc(100% - ${theme.spacing(2)}px)`,
    width: `calc(100% - ${theme.spacing(2)}px)`,
  },
  card: {
    minHeight: "100%",
    minWidth: "100%",
  },
  media: {
    height: 320,
    backgroundSize: "contain",
  },
}));

export default cardStyle;
