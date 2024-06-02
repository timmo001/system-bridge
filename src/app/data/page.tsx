import { type Metadata } from "next";
import { Container } from "@mui/material";

import Data from "@/components/data";

export const metadata: Metadata = {
  title: "Data | System Bridge",
};

export default async function PageData() {
  return (
    <>
      <Container component="article" maxWidth="xl">
        <Data />
      </Container>
    </>
  );
}
