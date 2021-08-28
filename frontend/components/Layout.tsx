import React, { ReactElement } from "react";
import Head from "next/head";
import { ClassNameMap } from "@material-ui/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";

import Header from "./Header";
import HeaderLinks from "./HeaderLinks";
import Markdown from "./Markdown";

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
          {props.title
            ? `${props.title} - System Bridge`
            : `System Bridge`}
        </title>
        <link rel="canonical" href={props.url} />
        <meta
          name="description"
          content={
            props.description
              ? `${props.description}`
              : props.title
              ? `${props.title} - Frontend`
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
        <Card>
          <CardContent>
            <Typography component="div">
              <Markdown source="Copyright © Owner" />
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}

export default Layout;
