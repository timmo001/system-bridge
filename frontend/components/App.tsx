import React, { ReactElement } from "react";
import { responsiveFontSizes, ThemeProvider } from "@material-ui/core/styles";
import { grey, deepPurple } from "@material-ui/core/colors";
import { createTheme } from "@material-ui/core/styles";
import "typeface-roboto";

import { SettingsProvider } from "./Utils";
import Main from "./Main";

const theme = responsiveFontSizes(
  createTheme({
    palette: {
      type: "dark",
      primary: {
        dark: deepPurple[800],
        main: deepPurple[700],
        light: deepPurple[600],
      },
      secondary: deepPurple,
      background: {
        default: "#121212",
        paper: grey[900],
      },
      contrastThreshold: 3,
      tonalOffset: 0.2,
    },
  })
);

function App(): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <SettingsProvider>
        <Main />
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
