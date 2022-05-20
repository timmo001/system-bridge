import React, { ReactElement } from "react";
import { GetStaticProps } from "next";

import { PlayerProvider } from "../../../components/Player/Utils";
import Layout from "../../../components/Common/Layout";
import Player from "../../../components/Player/Player";

function PageLogs(): ReactElement {
  return (
    <Layout
      title="Video Player"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      noHeader
      noFooter
    >
      <PlayerProvider>
        <Player playerType="video" />
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
