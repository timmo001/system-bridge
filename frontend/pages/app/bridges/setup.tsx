import React, { ReactElement } from "react";

import Layout from "../../../components/Common/Layout";
import Setup from "../../../components/Bridges/Setup";

function PageBridges(): ReactElement {
  return (
    <Layout
      title="Bridges"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      noHeader
      noFooter
    >
      <Setup />
    </Layout>
  );
}

export default PageBridges;
