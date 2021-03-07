import React, { ReactElement } from "react";
import {
  createMuiTheme,
  responsiveFontSizes,
  ThemeProvider,
} from "@material-ui/core/styles";
import { cyan, blue, grey } from "@material-ui/core/colors";

import "typeface-roboto";

import Main from "./Main";
import { SettingsProvider } from "./Utils";

const theme = responsiveFontSizes(
  createMuiTheme({
    palette: {
      type: "dark",
      primary: blue,
      secondary: cyan,
      text: {
        primary: grey[100],
        secondary: grey[200],
        disabled: grey[400],
      },
      background: {
        default: "#121212",
        paper: grey[900],
      },
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
