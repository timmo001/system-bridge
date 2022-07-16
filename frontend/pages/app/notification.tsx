import React, { ReactElement, useMemo } from "react";
import { useRouter } from "next/router";

import { Button, CardMedia, Stack, Typography, useTheme } from "@mui/material";

import { API, APIRequest } from "components/Common/API";
import Layout from "components/Common/Layout";

interface NotificationAction {
  command: string;
  data?: NodeJS.Dict<any>;
  label: string;
}

function PageNotification(): ReactElement {
  const router = useRouter();
  const { apiPort, apiKey, title, message, icon, image, actions } =
    router.query as NodeJS.Dict<string>;

  function handleClose(): void {
    window.location.href = "http://close.window";
  }

  function handleActionClick(action: NotificationAction): void {
    console.log("Action clicked:", action);
    switch (action.command) {
      case "api":
        new API(Number(apiPort) || 9170, String(apiKey))
          .request(action.data as APIRequest)
          .then((response) => {
            console.log("API Response:", response.data);
          })
          .catch((error) => {
            console.error("API Error:", error);
          });
        break;
      case "close":
        handleClose();
        break;
      default:
        break;
    }
  }

  const actionsArr = useMemo<Array<NotificationAction> | null>(() => {
    if (actions) {
      try {
        return JSON.parse(actions) as Array<NotificationAction>;
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  }, [actions]);

  const theme = useTheme();
  return (
    <Layout
      title="Notification"
      url="https://system-bridge.timmo.dev"
      description="Frontend for System Bridge"
      closeButton
      noHeader
    >
      <Stack
        direction="column"
        alignContent="center"
        justifyContent="flex-start"
        style={{
          height: "100vh",
          width: "100%",
          overflow: "hidden",
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
        {message && (
          <Typography
            component="div"
            variant="body2"
            color="text.secondary"
            sx={{
              padding: theme.spacing(0, icon ? 7 : 2, 1),
            }}
          >
            {message}
          </Typography>
        )}
        {image && (
          <CardMedia
            component="img"
            image={image}
            alt="Notification Image"
            sx={{
              height: "280px",
              maxHeight: "280px",
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        )}
        {actionsArr && (
          <Stack
            direction="row"
            alignContent="center"
            justifyContent="flex-end"
            sx={{
              padding: theme.spacing(1),
            }}
          >
            {actionsArr.map((action: NotificationAction) => (
              <Button
                key={action.label}
                variant="contained"
                color="primary"
                sx={{
                  margin: theme.spacing(1, 0.5, 1, 0.5),
                }}
                onClick={() => handleActionClick(action)}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        )}
      </Stack>
    </Layout>
  );
}

export default PageNotification;
