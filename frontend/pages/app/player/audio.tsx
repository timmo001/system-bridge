import React, { ReactElement } from "react";
import { GetStaticProps } from "next";

import { PlayerProvider } from "../../../components/Player/Utils";
import Layout from "../../../components/Common/Layout";
import Player from "../../../components/Player/Player";
import useStyles from "../../../assets/jss/components/layout";

function PageLogs(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
      title="Audio Player"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      noHeader
      noFooter
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
