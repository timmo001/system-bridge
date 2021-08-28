import { makeStyles, Theme } from "@material-ui/core/styles";

import tooltipsStyle from "../tooltips";

const headerLinksStyle = makeStyles((theme: Theme) => ({
  list: {
    fontSize: 14,
    margin: 0,
    paddingLeft: "0",
    listStyle: "none",
    paddingTop: "0",
    paddingBottom: "0",
    color: "inherit",
  },
  listItem: {
    float: "left",
    color: "inherit",
    position: "relative",
    display: "block",
    width: "auto",
    margin: "0",
    padding: "0",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      "&:after": {
        width: "calc(100% - 30px)",
        content: '""',
        display: "block",
        height: 1,
        marginLeft: 15,
        backgroundColor: "#e5e5e5",
      },
    },
  },
  listItemText: {
    paddingTop: 4,
  },
  navLink: {
    color: "inherit",
    position: "relative",
    padding: "0.9375rem",
    fontWeight: 400,
    fontSize: 14,
    textTransform: "uppercase",
    borderRadius: 3,
    lineHeight: "20px",
    textDecoration: "none",
    margin: 0,
    display: "inline-flex",
    "&:hover,&:focus": {
      color: "inherit",
      background: "rgba(200, 200, 200, 0.2)",
    },
    [theme.breakpoints.down("sm")]: {
      width: "calc(100% - 30px)",
      marginLeft: 15,
      marginBottom: 8,
      marginTop: 8,
      textAlign: "left",
      "& > span:first-child": {
        justifyContent: "flex-start",
      },
    },
  },
  notificationNavLink: {
    color: "inherit",
    padding: "0.9375rem",
    fontWeight: 400,
    fontSize: 12,
    textTransform: "uppercase",
    lineHeight: 20,
    textDecoration: "none",
    margin: 0,
    display: "inline-flex",
    top: 4,
  },
  registerNavLink: {
    top: 3,
    position: "relative",
    fontWeight: 400,
    fontSize: 12,
    textTransform: "uppercase",
    lineHeight: 20,
    textDecoration: "none",
    margin: 0,
    display: "inline-flex",
  },
  navLinkActive: {
    color: "inherit",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  icons: {
    width: 20,
    height: 20,
    marginRight: 3,
  },
  socialIcons: {
    position: "relative",
    fontSize: "20px !important",
    marginRight: 4,
  },
  dropdownLink: {
    "&,&:hover,&:focus": {
      color: "inherit",
      textDecoration: "none",
      display: "block",
      padding: "10px 20px",
    },
  },
  ...tooltipsStyle,
  divider: {
    height: "100%",
    padding: theme.spacing(1),
  },
  icon: {
    color: "inherit",
  },
}));

export default headerLinksStyle;
