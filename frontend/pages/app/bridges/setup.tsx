import React, { ReactElement } from "react";
import { GetStaticProps } from "next";

import Layout from "../../../components/Common/Layout";
import Setup from "../../../components/Bridges/Setup";
import useStyles from "../../../assets/jss/components/layout";

function PageBridges(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
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

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 1,
  };
};

export default PageBridges;
