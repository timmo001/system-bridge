import { makeStyles, Theme } from "@material-ui/core/styles";

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
