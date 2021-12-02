import React, { ReactElement } from "react";
import { Container } from "@mui/material";
import { GetStaticProps } from "next";

import Layout from "../../components/Common/Layout";
import Logs from "../../components/Logs/Logs";
import useStyles from "../../assets/jss/components/layout";

function PageLogs(): ReactElement {
  const classes = useStyles();

  return (
    <Layout
      classes={classes}
      title="Logs"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
    >
      <Container className={classes.main} component="article" maxWidth="xl">
        <Logs />
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

export default PageLogs;
