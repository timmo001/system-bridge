import React, { ReactElement } from "react";

import { PlayerProvider } from "components/Player/Utils";
import Layout from "components/Common/Layout";
import Player from "components/Player/Player";

function PagePlayerAudio(): ReactElement {
  return (
    <Layout
      title="Audio Player"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      closeButton
      noHeader
    >
      <PlayerProvider>
        <Player playerType="audio" />
      </PlayerProvider>
    </Layout>
  );
}

export default PagePlayerAudio;
