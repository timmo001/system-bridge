import React, { ReactElement } from "react";
import { GetStaticProps } from "next";

import { PlayerProvider } from "../../../components/Player/Utils";
import Layout from "../../../components/Common/Layout";
import Player from "../../../components/Player/Player";

function PageLogs(): ReactElement {
  return (
    <Layout
      title="Audio Player"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      noHeader
    >
      <PlayerProvider>
        <Player playerType="audio" />
      </PlayerProvider>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 1,
  };
};

export default PageLogs;
