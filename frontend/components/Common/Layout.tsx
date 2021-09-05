import React, { ReactElement } from "react";
import Head from "next/head";
import { Container } from "@material-ui/core";
import { ClassNameMap } from "@material-ui/styles";

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
