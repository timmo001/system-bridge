import { ReactElement } from "react";
import {
  Box,
  createStyles,
  Grid,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    spacer: {
      height: theme.spacing(6),
    },
  })
);

function Footer(): ReactElement {
  const classes = useStyles();

  return (
    <>
      <Box className={classes.spacer} />
      <Grid container direction="row" justifyContent="center">
        <Typography component="span" variant="body1">
          Not sure what to do now? Check out the{" "}
          <a
            href="https://system-bridge.timmo.dev"
            target="_blank"
            rel="noreferrer"
          >
            website
          </a>{" "}
          for more information and documentation.
        </Typography>
      </Grid>
      <Box className={classes.spacer} />
      <Grid container direction="row" justifyContent="center">
        <Typography component="span" variant="body1">
          Found an issue? Report it{" "}
          <a
            href="https://github.com/timmo001/system-bridge/issues/new/choose"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </Typography>
      </Grid>
      <Grid container direction="row" justifyContent="center">
        <Typography component="span" variant="body1">
          Thought of a feature that could be added? Suggest it{" "}
          <a
            href="https://github.com/timmo001/system-bridge/issues/new/choose"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </Typography>
      </Grid>
      <Box className={classes.spacer} />
      <Grid container direction="row" justifyContent="center">
        <Typography component="span" variant="body1">
          Participate in discussions and get help{" "}
          <a
            href="https://github.com/timmo001/system-bridge/discussions"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </Typography>
      </Grid>
    </>
  );
}

export default Footer;
