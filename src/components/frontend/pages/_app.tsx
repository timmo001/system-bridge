import React, { ReactElement, useEffect } from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import { CssBaseline, ThemeProvider } from "@material-ui/core";

import { SettingsProvider } from "../components/Common/Utils";
import theme from "../components/Common/Theme";

import "../assets/css/style.css";
import "@fontsource/roboto";

function App({ Component, pageProps }: AppProps): ReactElement {
  useEffect(() => {
    document.documentElement.lang = "en-GB";
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);

  <meta name="viewport" content="width=device-width, initial-scale=1.0" />;

  return (
    <>
      <Head>
        <title>My page</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </Head>
      <ThemeProvider theme={theme}>
        <SettingsProvider>
          <>
            <CssBaseline />
            <Component {...pageProps} />
          </>
        </SettingsProvider>
      </ThemeProvider>
    </>
  );
}

export default App;
