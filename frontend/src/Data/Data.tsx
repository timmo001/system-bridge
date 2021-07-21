import { ReactElement, useEffect, useMemo, useState } from "react";
import {
  CircularProgress,
  Container,
  createStyles,
  Grid,
  makeStyles,
  Theme,
} from "@material-ui/core";
import axios, { AxiosResponse } from "axios";

import { parsedQuery } from "../Utils";
import { useSettings } from "../Utils";
import Footer from "../Common/Footer";
import Header from "../Common/Header";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      padding: theme.spacing(2),
    },
    center: {
      textAlign: "center",
    },
    disabled: {
      userSelect: "none",
    },
    secondaryAction: {
      width: 400,
      textAlign: "end",
    },
  })
);

function DataComponent(): ReactElement {
  const [settings] = useSettings();

  const classes = useStyles();

  return (
    <Container className={classes.root} maxWidth="lg">
      <Header name="Data" />
      <Grid container direction="column" spacing={2} alignItems="stretch">
        {!settings ? (
          <Grid container direction="row" justifyContent="center">
            <CircularProgress />
          </Grid>
        ) : (
          <Grid container direction="row" justifyContent="center"></Grid>
        )}
      </Grid>
      <Footer />
    </Container>
  );
}

export default DataComponent;
