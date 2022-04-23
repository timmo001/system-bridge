import React, { ReactElement } from "react";
import { Grid, List, Paper, Typography } from "@mui/material";

export interface SectionProps {
  name: string;
  description: string;
  children: ReactElement;
}

function Section({ name, description, children }: SectionProps): ReactElement {
  return (
    <Grid container direction="row" item xs={12}>
      <Grid item xs={4} style={{ userSelect: "none" }}>
        <Typography component="h3" variant="h5">
          {name}
        </Typography>
        <Typography variant="subtitle1">{description}</Typography>
      </Grid>
      <Grid item xs={8}>
        <Paper>
          <List>{children}</List>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default Section;
