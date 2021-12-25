import React, { ReactElement } from "react";
import { GetStaticProps } from "next";

import OpenOn from "../../../components/Bridges/OpenOn";
import Layout from "../../../components/Common/Layout";
import useStyles from "../../../assets/jss/components/layout";

function PageBridges(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
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

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 1,
  };
};

export default PageBridges;
