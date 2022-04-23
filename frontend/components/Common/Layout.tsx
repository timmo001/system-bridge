import React, { ReactElement, useEffect } from "react";
import { Container } from "@mui/material";
import { useRouter } from "next/router";
import Head from "next/head";

import { useSettings } from "../Contexts/Settings";
import Footer from "./Footer";
import Header from "./Header";
import HeaderLinks from "./HeaderLinks";

interface LayoutProps {
  children?: ReactElement | ReactElement[];
  description?: string;
  keywords?: string;
  noFooter?: boolean;
  noHeader?: boolean;
  title?: string;
  url?: string;
}

function Layout(props: LayoutProps): ReactElement {
  const [settings, setSettings] = useSettings();

  const router = useRouter();
  const query = router.query;

  useEffect(() => {
    if (
      query &&
      Object.keys(query).length > 0 &&
      typeof window !== "undefined"
    ) {
      let newApiKey: string | null = null,
        newApiPort: string | null = null;
      if (!query?.apiKey)
        newApiKey = window.prompt("Please enter your API key", "");
      if (!query?.apiPort)
        newApiPort = window.prompt(
          "Please enter your API port (default: 9170)",
          (query.apiPort as string) || "9170"
        );
      if (newApiKey && newApiPort)
        router.replace(
          `${router.pathname}?apiKey=${newApiKey}&apiPort=${newApiPort}`
        );
    }
  }, [router, query]);

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
      {!props.noHeader && (
        <Header brand="System Bridge" rightLinks={<HeaderLinks />} />
      )}
      {props.children}
      {!props.noFooter && (
        <Container component="footer" maxWidth="xl">
          <Footer />
        </Container>
      )}
    </>
  );
}

export default Layout;
