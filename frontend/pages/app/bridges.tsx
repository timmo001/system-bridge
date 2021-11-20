import React, { ReactElement } from "react";
import { Container } from "@material-ui/core";
import { GetStaticProps } from "next";

import Bridges from "../../components/Bridges/Bridges";
import Layout from "../../components/Common/Layout";
import useStyles from "../../assets/jss/components/layout";

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
      <Bridges />
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
