import { makeStyles, Theme } from "@material-ui/core/styles";

import { boxShadow, defaultFont, drawerWidth, transition } from "../shared";

const headerStyle = makeStyles((theme: Theme) => ({
  appBar: {
    display: "flex",
    border: 0,
    borderRadius: 3,
    padding: "0.625rem 0",
    marginBottom: 20,
    width: "100%",
    maxHeight: 88,
    boxShadow:
      "0 4px 18px 0px rgba(0, 0, 0, 0.12), 0 7px 10px -5px rgba(0, 0, 0, 0.15)",
    transition: "all 150ms ease 0s",
    alignItems: "center",
    flexFlow: "row nowrap",
    justifyContent: "flex-start",
    position: "relative",
    zIndex: "unset",
  },
  absolute: {
    position: "absolute",
    zIndex: 1100,
  },
  fixed: {
    position: "fixed",
    zIndex: 1100,
  },
  container: {
    minHeight: 50,
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    display: "flex",
    flexWrap: "nowrap",
  },
  flex: {
    flex: 1,
  },
  title: {
    ...defaultFont,
    lineHeight: "30px",
    borderRadius: 3,
    textTransform: "none",
    marginTop: -2,
    userSelect: "none",
    color: theme.palette.primary.contrastText,
    padding: "8px 16px",
    letterSpacing: "unset",
    "&:hover,&:focus": {
      background: "transparent",
    },
  },
  appResponsive: {
    margin: "20px 10px",
  },
  primary: {
    backgroundColor: theme.palette.primary.main,
    color: "#FFFFFF",
  },
  transparent: {
    backgroundColor: "transparent !important",
    boxShadow: "none",
    paddingTop: 25,
    color: "#FFFFFF",
  },
  drawerPaper: {
    border: "none",
    bottom: "0",
    transitionProperty: "top, bottom, width",
    transitionDuration: ".2s, .2s, .35s",
    transitionTimingFunction: "linear, linear, ease",
    width: drawerWidth,
    ...boxShadow,
    position: "fixed",
    display: "block",
    top: "0",
    height: "100vh",
    right: "0",
    left: "auto",
    visibility: "visible",
    overflowY: "visible",
    borderTop: "none",
    textAlign: "left",
    paddingRight: "0px",
    paddingLeft: "0",
    ...transition,
  },
  disabled: {
    userSelect: "none",
  },
  smallButton: {
    margin: theme.spacing(-1, -0.5),
  },
  spacer: {
    height: theme.spacing(6),
  },
  version: {
    margin: theme.spacing(3, 2, 0),
    verticalAlign: "middle",
  },
}));

export default headerStyle;
