import React, { ReactElement } from "react";

import OpenOn from "../../../components/Bridges/OpenOn";
import Layout from "../../../components/Common/Layout";

function PageBridges(): ReactElement {
  return (
    <Layout
      title="Open URL On"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      noHeader
      noFooter
    >
      <OpenOn />
    </Layout>
  );
}

export default PageBridges;
