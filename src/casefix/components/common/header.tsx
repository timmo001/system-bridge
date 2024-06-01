import React, { cloneElement, ReactElement } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Grid,
  Toolbar,
  Typography,
  useScrollTrigger,
  useTheme,
} from "@mui/material";

interface ElevationScrollProps {
  children: ReactElement;
}

function ElevationScroll({ children }: ElevationScrollProps) {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 24,
  });

  return cloneElement(children, {
    elevation: trigger ? 4 : 0,
  });
}

function Header(): ReactElement {
  const theme = useTheme();

  return (
    <>
      <ElevationScroll>
        <>
          <AppBar color="transparent" elevation={0}>
            <Container maxWidth="xl" sx={{ padding: 0 }}>
              <Toolbar
                sx={{
                  minHeight: 50,
                  maxHeight: 50,
                  padding: 0,
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "space-between",
                  display: "flex",
                  flexWrap: "nowrap",
                }}
              >
                <Grid item>
                  <Button
                    href="https://system-bridge.timmo.dev"
                    target="_blank"
                  >
                    <Typography
                      component="div"
                      variant="h4"
                      sx={{
                        textTransform: "none",
                        userSelect: "none",
                        color: theme.palette.primary.contrastText,
                      }}
                    >
                      System Bridge
                    </Typography>
                  </Button>
                </Grid>
              </Toolbar>
            </Container>
          </AppBar>
          <Box sx={{ height: theme.spacing(10) }} />
        </>
      </ElevationScroll>
    </>
  );
}

export default Header;
