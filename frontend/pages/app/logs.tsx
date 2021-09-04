import React, { ReactElement, useEffect } from "react";
import { GetStaticProps } from "next";
import { useRouter } from "next/dist/client/router";
import { Container } from "@material-ui/core";

import { getSettings, useSettings } from "../../components/Common/Utils";
import Logs from "../../components/Logs/Logs";
import Layout from "../../components/Common/Layout";
import useStyles from "../../assets/jss/components/layout";

function PageLogs(): ReactElement {
  const [settings, setSettings] = useSettings();

  const query = useRouter().query;

  useEffect(() => {
    try {
      (async () => {
        if (!settings && query && query.apiKey)
          setSettings(await getSettings(query));
      })();
    } catch (e) {
      console.warn("Error getting settings:", e);
    }
  }, [settings, setSettings, query]);

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
