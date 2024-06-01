"use client";
import { Roboto } from "next/font/google";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { deepPurple, grey } from "@mui/material/colors";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

// Create a theme instance.
export const theme = responsiveFontSizes(
  createTheme({
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
        paper: "#212121",
      },
      contrastThreshold: 3,
      tonalOffset: 0.2,
    },
    typography: {
      fontFamily: roboto.style.fontFamily,
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
  })
);
