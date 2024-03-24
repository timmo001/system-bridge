import { type ReactElement, useEffect, useMemo } from "react";
import { window } from "@tauri-apps/api";
import { CssBaseline, ThemeProvider } from "@mui/material";

import "@fontsource/roboto";

import { SettingsProvider } from "./components/Contexts/Settings";
import theme from "./components/Common/Theme";

function App(): ReactElement {
  const label = useMemo<string>(() => {
    return window.getCurrent().label;
  }, []);

  console.log("label:", label);

  return (
    <>
      <SettingsProvider>
        <ThemeProvider theme={theme}>
          <>
            <CssBaseline />
            <main>
              <p>Hello, {label}!</p>
            </main>
          </>
        </ThemeProvider>
      </SettingsProvider>
    </>
  );
}

export default App;
