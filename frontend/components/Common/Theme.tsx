import {
  createTheme,
  responsiveFontSizes,
} from "@mui/material/styles";
import { deepPurple, grey } from "@mui/material/colors";

let theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      dark: deepPurple[800],
      main: deepPurple[700],
      light: deepPurple[600],
    },
    secondary: deepPurple,
    background: {
      default: grey[900],
      paper: "#292929",
    },
    contrastThreshold: 3,
    tonalOffset: 0.2,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          margin: 8,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "24px 32px",
          "&:last-child": {
            paddingBottom: 16,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          margin: 4,
        },
      },
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          justifyContent: "flex-end",
        },
      },
    },
  },
});
theme = responsiveFontSizes(theme);

export default theme;
