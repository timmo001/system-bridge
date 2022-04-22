import React, { ReactElement } from "react";
import { Container } from "@mui/material";

import Layout from "components/Common/Layout";

function PageData(): ReactElement {
  return (
    <Layout
      title="Placeholder"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
    >
      <Container component="article" maxWidth="xl">
        <></>
      </Container>
    </Layout>
  );
}

export default PageData;
