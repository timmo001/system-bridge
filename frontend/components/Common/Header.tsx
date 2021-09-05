import React, { ReactElement, useEffect, useState } from "react";
import clsx from "clsx";
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  Grid,
  Hidden,
  IconButton,
  PropTypes,
  Toolbar,
  Typography,
} from "@material-ui/core";
import { Menu } from "@material-ui/icons";
// import { mdiContentCopy } from "@mdi/js";
// import Icon from "@mdi/react";

// import { handleCopyToClipboard } from "../Common/Utils";
import { useInformation } from "../Contexts/Information";
import useStyles from "../../assets/jss/components/header";

type ColorExpanded = PropTypes.Color | "transparent";

interface ChangeColorOnScroll {
  color: ColorExpanded;
  height: string | number;
}

interface HeaderProps {
  absolute?: string;
  brand?: string;
  changeColorOnScroll?: ChangeColorOnScroll;
  color?: ColorExpanded;
  fixed?: boolean;
  rightLinks?: ReactElement;
}

function Header(props: HeaderProps): ReactElement {
  const [information] = useInformation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (props.changeColorOnScroll) {
      window.addEventListener("scroll", headerColorChange);
    }
    return function cleanup() {
      if (props.changeColorOnScroll) {
        window.removeEventListener("scroll", headerColorChange);
      }
    };
  }, []);

  const classes = useStyles();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const headerColorChange = () => {
    const { color, changeColorOnScroll } = props;
    const windowsScrollTop = window.pageYOffset;
    if (windowsScrollTop > changeColorOnScroll.height) {
      document.body
        .getElementsByTagName("header")[0]
        .classList.remove(classes[color]);
      document.body
        .getElementsByTagName("header")[0]
        .classList.add(classes[changeColorOnScroll.color]);
    } else {
      document.body
        .getElementsByTagName("header")[0]
        .classList.add(classes[color]);
      document.body
        .getElementsByTagName("header")[0]
        .classList.remove(classes[changeColorOnScroll.color]);
    }
  };

  const { color, rightLinks, brand, fixed, absolute } = props;
  return (
    <>
      <AppBar
        className={clsx({
          [classes.appBar]: true,
          [classes[color]]: color,
          [classes.absolute]: absolute,
          [classes.fixed]: fixed,
        })}
        color={color}
      >
        <Container maxWidth="xl">
          <Toolbar className={classes.container}>
            <Grid item>
              <Button href="https://system-bridge.timmo.dev" target="_blank">
                {/* <img src={logo} alt="System Bridge Logo" /> */}
                <Typography
                  className={classes.title}
                  component="div"
                  variant="h4"
                >
                  {brand}
                </Typography>
              </Button>
              {information ? (
                <>
                  <Typography
                    className={clsx(classes.disabled, classes.version)}
                    component="span"
                    variant="h5"
                  >
                    {information.version}
                  </Typography>
                  <Typography
                    className={clsx(classes.disabled, classes.version)}
                    component="span"
                    variant="subtitle1"
                  >
                    {information.updates?.available ? (
                      <a
                        href={information.updates?.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Version {information.updates.version.new} avaliable!
                      </a>
                    ) : (
                      ""
                    )}
                  </Typography>
                </>
              ) : (
                ""
              )}
            </Grid>
            <Hidden smDown implementation="css">
              {rightLinks}
            </Hidden>
            <Hidden mdUp>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
              >
                <Menu />
              </IconButton>
            </Hidden>
          </Toolbar>
          <Hidden mdUp implementation="css">
            <Drawer
              variant="temporary"
              anchor={"right"}
              open={mobileOpen}
              classes={{
                paper: classes.drawerPaper,
              }}
              onClose={handleDrawerToggle}
            >
              <div className={classes.appResponsive}>{rightLinks}</div>
            </Drawer>
          </Hidden>
        </Container>
      </AppBar>
      <Box className={classes.spacer} />
      <Box className={classes.spacer} />
      {/* <Container maxWidth="xl" style={{ zIndex: 1000 }}>
        <Grid container alignItems="flex-start" justifyContent="space-around">
          <Grid className={classes.headerItem} item></Grid>
          <Grid className={classes.headerItem} item>
            {information?.host ? (
              <Typography component="h5" variant="subtitle1">
                <span className={classes.disabled}>Host: </span>
                {information.host}
                <IconButton
                  className={classes.smallButton}
                  aria-label="Copy to clipboard"
                  onClick={() => handleCopyToClipboard(information.host)}
                >
                  <Icon
                    title="Copy to clipboard"
                    size={0.8}
                    path={mdiContentCopy}
                  />
                </IconButton>
              </Typography>
            ) : (
              ""
            )}
            {information?.ip ? (
              <Typography component="h5" variant="subtitle1">
                <span className={classes.disabled}>IP: </span>
                {information.ip}
                <IconButton
                  className={classes.smallButton}
                  aria-label="Copy to clipboard"
                  onClick={() => handleCopyToClipboard(information.ip)}
                >
                  <Icon
                    title="Copy to clipboard"
                    size={0.8}
                    path={mdiContentCopy}
                  />
                </IconButton>
              </Typography>
            ) : (
              ""
            )}
            {information?.uuid ? (
              <Typography component="h5" variant="subtitle1">
                <span className={classes.disabled}>UUID: </span>
                {information.uuid}
                <IconButton
                  className={classes.smallButton}
                  aria-label="Copy to clipboard"
                  onClick={() => handleCopyToClipboard(information.uuid)}
                >
                  <Icon
                    title="Copy to clipboard"
                    size={0.8}
                    path={mdiContentCopy}
                  />
                </IconButton>
              </Typography>
            ) : (
              ""
            )}
          </Grid>
        </Grid>
      </Container> */}
      <Box className={classes.spacer} />
    </>
  );
}

export default Header;
