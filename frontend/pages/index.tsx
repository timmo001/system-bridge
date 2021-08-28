import React, { ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container } from "@material-ui/core";

import Layout from "components/Layout";
import useStyles from "assets/jss/components/layout";

function Home(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
      title="Home"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
    >
      <Container className={classes.main} component="article" maxWidth="xl">
        <></>
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

export default Home;
