import { ReactElement } from "react";
import dynamic from "next/dynamic";
import { CardContent, CircularProgress, Grid, Typography } from "@mui/material";

const BrowserReactJsonView = dynamic(() => import("react-json-view"), {
  ssr: false,
});

function DataItemsComponent({
  name,
  data,
}: {
  name: string;
  data: any;
}): ReactElement {
  return (
    <CardContent>
      <Typography gutterBottom variant="h4" component="h3">
        {name}
      </Typography>
      {data ? (
        <BrowserReactJsonView
          src={data}
          displayDataTypes={false}
          displayObjectSize
          enableClipboard
          iconStyle="triangle"
          name={null}
          collapseStringsAfterLength={140}
          style={{ background: "initial", maxWidth: "100%" }}
          theme="google"
        />
      ) : (
        <Grid container direction="row" justifyContent="center">
          <CircularProgress />
        </Grid>
      )}
    </CardContent>
  );
}

export default DataItemsComponent;
