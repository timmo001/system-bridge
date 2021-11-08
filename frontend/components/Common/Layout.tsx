import React, { ReactElement, useEffect } from "react";
import { ClassNameMap } from "@material-ui/styles";
import { Container } from "@material-ui/core";
import { useRouter } from "next/dist/client/router";
import Head from "next/head";

import { getInformation, getSettings } from "./Utils";
import { useInformation } from "../Contexts/Information";
import { useSettings } from "../Contexts/Settings";
import Footer from "./Footer";
import Header from "./Header";
import HeaderLinks from "./HeaderLinks";

interface LayoutProps {
  children?: ReactElement | ReactElement[];
  classes: ClassNameMap;
  description?: string;
  keywords?: string;
  title?: string;
  url?: string;
}

function Layout(props: LayoutProps): ReactElement {
  const [information, setInformation] = useInformation();
  const [settings, setSettings] = useSettings();

  const router = useRouter();
  const query = router.query;

  useEffect(() => {
    console.log(query, query.apiKey);
    if (query && Object.keys(query).length > 0)
      if (!query.apiKey) {
        const response: string = window.prompt("Please enter your API key", "");
        if (response)
          router.replace(
            `${router.pathname}?apiKey=${response}&apiPort=${query.apiPort}&wsPort=${query.wsPort}`
          );
      }
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        if (!information && query && query.apiKey)
          setInformation(await getInformation(query));
      } catch (e) {
        console.warn("Error getting information:", e);
      }
    })();
  }, [settings, setSettings, query]);

  useEffect(() => {
    (async () => {
      try {
        if (!settings && query && query.apiKey)
          setSettings(await getSettings(query));
      } catch (e) {
        console.warn("Error getting settings:", e);
      }
    })();
  }, [settings, setSettings, query]);

  const classes = props.classes;

  return (
    <>
      <Head>
        <title>
          {props.title ? `${props.title} - System Bridge` : `System Bridge`}
        </title>
        <link rel="canonical" href={props.url} />
        <meta
          name="description"
          content={
            props.description
              ? `${props.description}`
              : props.title
              ? `${props.title} - System Bridge`
              : `System Bridge`
          }
        />
        <meta
          name="keywords"
          content={
            props.keywords
              ? `${props.keywords}`
              : `system-bridge, system, bridge, typescript`
          }
        />
      </Head>
      <Header
        {...props}
        brand="System Bridge"
        changeColorOnScroll={{
          height: 200,
          color: "primary",
        }}
        color="transparent"
        fixed
        rightLinks={<HeaderLinks />}
      />
      {props.children}
      <Container className={classes.footer} component="footer" maxWidth="xl">
        <Footer />
      </Container>
    </>
  );
}

export default Layout;
