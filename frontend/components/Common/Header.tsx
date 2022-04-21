import React, { ReactElement, useCallback, useEffect, useState } from "react";
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
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiMenu } from "@mdi/js";

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

  const classes = useStyles();

  const headerColorChange = useCallback(() => {
    const { color, changeColorOnScroll } = props;
    if (!color || !changeColorOnScroll) return;
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
  }, [classes, props]);

  useEffect(() => {
    if (props.changeColorOnScroll) {
      window.addEventListener("scroll", headerColorChange);
    }
    return function cleanup() {
      if (props.changeColorOnScroll) {
        window.removeEventListener("scroll", headerColorChange);
      }
    };
  }, [headerColorChange, props.changeColorOnScroll]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
        <Container className={classes.containerBase} maxWidth="xl">
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
            <Hidden lgDown implementation="css">
              {rightLinks}
            </Hidden>
            <Hidden mdUp>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                size="large"
              >
                <Icon path={mdiMenu} size={1} />
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
      <Box className={classes.spacer} />
    </>
  );
}

export default Header;
