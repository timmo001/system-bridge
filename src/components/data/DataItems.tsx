import { ReactElement } from "react";
import { CircularProgress, Grid, Typography } from "@mui/material";
import { type CollapsedFieldProps } from "react-json-view";
import dynamic from "next/dynamic";

import { type Modules } from "types/models";

const BrowserReactJsonView = dynamic(() => import("react-json-view"), {
  ssr: false,
});

export default function DataItemsComponent({
  title,
  data,
}: {
  title: string;
  data?: Modules;
}): ReactElement {
  return (
    <>
      <Typography gutterBottom variant="h4" component="h3">
        {title}
      </Typography>
      {data ? (
        <>
          <BrowserReactJsonView
            collapseStringsAfterLength={120}
            displayDataTypes={false}
            displayObjectSize
            enableClipboard
            name={null}
            shouldCollapse={(field: CollapsedFieldProps): boolean => {
              console.log(field);
              return field.name &&
                field.type === "array" &&
                Array.isArray(field.src) &&
                field.src.length > 2
                ? true
                : false;
            }}
            src={data}
            style={{ background: "initial", maxWidth: "100%" }}
            theme="google"
          />
        </>
      ) : (
        <Grid container direction="row" justifyContent="center">
          <CircularProgress />
        </Grid>
      )}
    </>
  );
}
