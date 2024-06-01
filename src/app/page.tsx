import { type Metadata } from "next";
import { Container, Typography } from "@mui/material";

export const metadata: Metadata = {
  title: "Home | System Bridge",
};

export default async function PageHome() {
  return (
    <>
      <Container
        component="article"
        maxWidth="xl"
        sx={{ height: "100vh", p: 4 }}
      >
        <Typography variant="h4" sx={{ textAlign: "center" }}>
          Welcome to System Bridge!
        </Typography>
      </Container>
    </>
  );
}
