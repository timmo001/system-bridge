import React, { ReactElement, useEffect } from "react";
import { AppProps } from "next/app";
import {
  CssBaseline,
  ThemeProvider,
  StyledEngineProvider,
} from "@mui/material";
import Head from "next/head";

import "@fontsource/roboto";

import { SettingsProvider } from "../components/Contexts/Settings";
import theme from "../components/Common/Theme";

import "../assets/css/style.css";

function App({ Component, pageProps }: AppProps): ReactElement {
  useEffect(() => {
    document.documentElement.lang = "en-GB";
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles?.parentElement)
      jssStyles.parentElement.removeChild(jssStyles);
  }, []);

  <meta name="viewport" content="width=device-width, initial-scale=1.0" />;

  return (
    <>
      <Head>
        <title>System Bridge</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </Head>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <SettingsProvider>
            <>
              <CssBaseline />
              <Component {...pageProps} />
            </>
          </SettingsProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </>
  );
}

export default App;
