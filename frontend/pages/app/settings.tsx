import React, { ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container } from "@mui/material";

import Layout from "../../components/Common/Layout";
import Settings from "../../components/Settings/Settings";
import useStyles from "../../assets/jss/components/layout";

function PageSettings(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
      title="Settings"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
    >
      <Container className={classes.main} component="article" maxWidth="xl">
        <Settings />
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

export default PageSettings;
