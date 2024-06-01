import { type Metadata } from "next";
import { Container } from "@mui/material";

import Settings from "@/components/settings";

export const metadata: Metadata = {
  title: "Settings | System Bridge",
};

export default async function PageSettings() {
  return (
    <>
      <Container component="article" maxWidth="xl">
        <Settings />
      </Container>
    </>
  );
}
