import React, { ReactElement } from "react";
import { useRouter } from "next/router";

import { CardMedia, Stack, Typography, useTheme } from "@mui/material";

import Layout from "components/Common/Layout";

function PageNotification(): ReactElement {
  const router = useRouter();
  const { title, content, icon, image } = router.query as NodeJS.Dict<string>;

  const theme = useTheme();
  return (
    <Layout
      title="Notification"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      noHeader
    >
      <Stack
        direction="column"
        alignContent="center"
        justifyContent="flex-start"
        style={{
          overflow: "hidden",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Stack
          direction="row"
          alignContent="center"
          justifyContent="flex-start"
          style={{
            padding: theme.spacing(1, 1, 1),
          }}
        >
          {icon && (
            <CardMedia
              component="img"
              image={icon}
              alt="Notification Icon"
              sx={{
                height: 28,
                width: 28,
                margin: theme.spacing(0.5, 0, 0.5, 1),
              }}
            />
          )}
          <Typography
            component="h1"
            variant="h5"
            sx={{
              margin: theme.spacing(0, 1),
            }}
          >
            {title}
          </Typography>
        </Stack>
        {content && (
          <Typography
            component="div"
            variant="body2"
            color="text.secondary"
            sx={{
              padding: theme.spacing(0, icon ? 7 : 2, 1),
            }}
          >
            {content}
          </Typography>
        )}
        {image && (
          <CardMedia
            component="img"
            image={image}
            alt="Notification Image"
            sx={{
              height: "100%",
              maxHeight: "100%",
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        )}
      </Stack>
    </Layout>
  );
}

export default PageNotification;
