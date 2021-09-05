import React, { ReactElement } from "react";
import { Container } from "@material-ui/core";
import { GetStaticProps } from "next";

import Data from "../../components/Data/Data";
import Layout from "../../components/Common/Layout";
import useStyles from "../../assets/jss/components/layout";

function PageData(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
      title="Data"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
    >
      <Container className={classes.main} component="article" maxWidth="xl">
        <Data />
      </Container>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 1,
  };
};

export default PageData;
