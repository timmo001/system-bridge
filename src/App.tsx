import { type ReactElement } from "react";
import {
  CssBaseline,
  ThemeProvider,
  StyledEngineProvider,
} from "@mui/material";

import "@fontsource/roboto";

import { SettingsProvider } from "./components/Contexts/Settings";
import theme from "./components/Common/Theme";

function App(): ReactElement {
  return (
    <>
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
