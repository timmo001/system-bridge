import React, { ReactElement } from "react";
import { Grid, List, Paper, Typography } from "@material-ui/core";

import { useSettings } from "../Utils";
import Item, { ConfigurationItem } from "./Item";

export interface ConfigurationSection {
  name: string;
  description?: string;
  icon?: string;
  items: {
    [item: string]: ConfigurationItem;
  };
}
export interface SectionProps {
  handleServerRestartRequired: () => void;
  sectionKey: string;
}

function Section({
  sectionKey,
  handleServerRestartRequired,
}: SectionProps): ReactElement {
  const [settings] = useSettings();

  const section: ConfigurationSection | undefined = settings?.[sectionKey];

  return (
    <Grid container direction="row" item xs={12}>
      <Grid item xs={4}>
        <Typography component="h3" variant="h5">
          {section?.name}
        </Typography>
        <Typography variant="subtitle1">{section?.description}</Typography>
      </Grid>
      <Grid item xs={8}>
        <Paper>
          <List>
            {section
              ? Object.keys(section.items).map((itemKey: string) => (
                  <Item
                    key={`${sectionKey}-${itemKey}`}
                    sectionKey={sectionKey}
                    itemKey={itemKey}
                    handleServerRestartRequired={handleServerRestartRequired}
                  />
                ))
              : ""}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default Section;
