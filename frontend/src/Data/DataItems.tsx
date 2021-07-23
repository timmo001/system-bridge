import { ReactElement } from "react";
import { CardContent, Typography } from "@material-ui/core";
import ReactJson from "react-json-view";

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
      <ReactJson
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
    </CardContent>
  );
}

export default DataItemsComponent;
