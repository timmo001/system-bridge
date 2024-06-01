import { Container } from "@mui/material";

import Settings from "@/components/settings";

export default async function PageSettings() {
  return (
    <>
      <Container component="article" maxWidth="xl">
        <Settings />
      </Container>
    </>
  );
}
