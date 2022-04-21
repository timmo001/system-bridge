import React, { ReactElement } from "react";
import { Container } from "@mui/material";

import Layout from "../../components/Common/Layout";
import Settings from "../../components/Settings/Settings";

function PageSettings(): ReactElement {
  return (
    <Layout
      title="Settings"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
    >
      <Container component="article" maxWidth="xl">
        <Settings />
      </Container>
    </Layout>
  );
}

export default PageSettings;
