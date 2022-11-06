import React, { ReactElement } from "react";

import { PlayerProvider } from "components/Player/Utils";
import Layout from "components/Common/Layout";
import Player from "components/Player/Player";

function PagePlayerVideo(): ReactElement {
  return (
    <Layout
      title="Video Player"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      closeButton
      noHeader
    >
      <PlayerProvider>
        <Player playerType="video" />
      </PlayerProvider>
    </Layout>
  );
}

export default PagePlayerVideo;
