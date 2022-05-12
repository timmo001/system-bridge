import React, { ReactElement, useCallback, useEffect } from "react";
import { Container } from "@mui/material";
import { useRouter } from "next/router";
import Head from "next/head";

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
  const router = useRouter();

  const checkQuery = useCallback(() => {
    console.log(
      "router.isReady:",
      router.isReady,
      "- router.query:",
      router.query
    );
    if (router.isReady && typeof window !== "undefined") {
      let newApiKey: string | null = (router.query?.apiKey as string) || "",
        newApiPort: string | null = (router.query?.apiPort as string) || "9170",
        needUpdate = false;
      if (!router.query?.apiKey) {
        needUpdate = true;
        newApiKey = window.prompt("Please enter your API key", newApiKey);
      }
      if (!router.query?.apiPort) {
        needUpdate = true;
        newApiPort = window.prompt(
          "Please enter your API port (default: 9170)",
          newApiPort
        );
      }
      if (needUpdate && newApiKey && newApiPort) {
        const newUrl = `${router.pathname}?apiKey=${newApiKey}&apiPort=${newApiPort}`;
        console.log("newUrl:", newUrl);
        router.push(newUrl);
      }
    }
  }, [router]);

  useEffect(() => {
    checkQuery();
  }, [checkQuery]);

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
