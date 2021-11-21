import React, { ReactElement } from "react";
import { GetStaticProps } from "next";

import SendTo from "../../../components/Bridges/SendTo";
import Layout from "../../../components/Common/Layout";
import useStyles from "../../../assets/jss/components/layout";

function PageBridges(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
      title="Send to Bridge"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      noHeader
      noFooter
    >
      <SendTo />
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
