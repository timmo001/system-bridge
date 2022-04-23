import React, { ReactElement } from "react";
import { Container } from "@mui/material";

import Data from "../../components/Data/Data";
import Layout from "../../components/Common/Layout";

function PageData(): ReactElement {
  return (
    <Layout
      title="Data"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
    >
      <Container component="article" maxWidth="xl">
        <Data />
      </Container>
    </Layout>
  );
}

export default PageData;
