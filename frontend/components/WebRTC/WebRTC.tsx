import React, { ReactElement, useCallback, useEffect } from "react";
import { useRouter } from "next/dist/client/router";
import { Fab, Theme } from "@mui/material";
import { Icon } from "@mdi/react";
import { largestRect } from "rect-scaler";
import { mdiPhoneHangup } from "@mdi/js";
import { v4 as uuidv4 } from "uuid";
import createStyles from "@mui/styles/createStyles";
import debounce from "lodash/debounce";
import makeStyles from "@mui/styles/makeStyles";
import Peer from "peerjs";

import { useSettings } from "../Contexts/Settings";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      maxWidth: "calc(var(--width) * var(--cols))",
      margin: "auto",
    },
    stream: {
      width: "var(--width)",
      height: "var(--height)",
      display: "inline-block",
      animation: "show 0.4s ease",
      overflow: "hidden",
      margin: "auto",
    },
    button: {
      position: "absolute",
      bottom: theme.spacing(1),
      left: "calc(50% - 28px)",
    },
  })
);

let peer: Peer | null,
  peerConnectionInterval: NodeJS.Timeout | null,
  mediaStream: MediaStream | null;

function WebRTC(): ReactElement {
  const [settings] = useSettings();

  const query = useRouter().query;

  const classes = useStyles();

  const recalculateLayout = useCallback(() => {
    const streamContainer = document.getElementById(
      "stream-container"
    ) as HTMLDivElement;
    const screenWidth = document.body.getBoundingClientRect().width;
    const screenHeight = document.body.getBoundingClientRect().height;
    const videoCount = document.getElementsByTagName("video").length;

    const { width, height, cols } = largestRect(
      screenWidth,
      screenHeight,
      videoCount || 2,
      16,
      9
    );

    streamContainer.style.setProperty("--width", width + "px");
    streamContainer.style.setProperty("--height", height + "px");
    streamContainer.style.setProperty("--cols", cols + "");
  }, []);

  const debouncedRecalculateLayout = debounce(recalculateLayout, 50);

  const updateStreams = useCallback(async () => {
    if (peer)
      peer.listAllPeers((peerIds: string[]) => {
        const streams = document.getElementsByTagName(
          "video"
        ) as HTMLCollectionOf<HTMLMediaElement>;
        for (let i = 0; i <= streams.length; i++) {
          const video = streams[i];
          if (video) {
            if (
              video.id !== "stream-host" &&
              !peerIds.includes(video.id.replace("stream-", ""))
            )
              video.remove();
            if (!video.srcObject) video.remove();
          }
        }
        debouncedRecalculateLayout();

        if (peerIds.length === 1) {
          console.log("No more peers. Closing stream");
          if (peerConnectionInterval) clearInterval(peerConnectionInterval);
          peerConnectionInterval = null;
          try {
            // window.api.ipcRendererSend("window-hide");
          } catch (e) {
            console.warn("Error calling window.api:", e);
          }
          if (mediaStream)
            mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
          const video = document.getElementById(
            "stream-host"
          ) as HTMLMediaElement;
          video.remove();
        }
        debouncedRecalculateLayout();
      });
  }, [debouncedRecalculateLayout]);

  const handleConnect = useCallback(async () => {
    window.addEventListener("resize", debouncedRecalculateLayout);

    const config = {
      host: window.location.hostname,
      key: String(query.apiKey),
      path: "/rtc",
      port: Number(query.apiPort) || 9170,
    };
    peer = new Peer(`host-${uuidv4()}`, config);

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
    });
    peer.on("connection", (dataConnection: Peer.DataConnection) => {
      console.log(`New connection from: ${dataConnection.peer}`);
    });
    peer.on("call", async (mediaConnection: Peer.MediaConnection) => {
      try {
        // window.api.ipcRendererSend("window-show");
      } catch (e) {
        console.warn("Error calling window.api:", e);
      }
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        // Answer the call, providing our mediaStream
        mediaConnection.answer(mediaStream);

        const streamContainer = document.getElementById(
          "stream-container"
        ) as HTMLDivElement;

        mediaConnection.on("stream", (stream: MediaStream) => {
          let video: HTMLMediaElement;
          const existingVideo = document.getElementById(
            `stream-${mediaConnection.peer}`
          ) as HTMLMediaElement | null;
          if (existingVideo) video = existingVideo;
          else video = document.createElement("video") as HTMLMediaElement;
          video.id = `stream-${mediaConnection.peer}`;
          video.className = classes.stream;
          video.srcObject = stream;
          streamContainer.appendChild(video);
          video.play();
          debouncedRecalculateLayout();
        });

        let video: HTMLMediaElement;
        const existingVideo = document.getElementById(
          "stream-host"
        ) as HTMLMediaElement | null;
        if (existingVideo) video = existingVideo;
        else video = document.createElement("video") as HTMLMediaElement;
        video.id = "stream-host";
        video.className = classes.stream;
        video.srcObject = mediaStream;
        video.muted = true;
        streamContainer.appendChild(video);
        video.play();
        debouncedRecalculateLayout();
      } catch (err) {
        console.error(err);
      }

      if (peerConnectionInterval) clearInterval(peerConnectionInterval);
      peerConnectionInterval = setInterval(updateStreams, 1000);
    });
  }, [
    classes.stream,
    debouncedRecalculateLayout,
    query.apiKey,
    query.apiPort,
    updateStreams,
  ]);

  useEffect(() => {
    if (settings) handleConnect();
    return () => {
      if (peer) {
        if (peerConnectionInterval) {
          clearInterval(peerConnectionInterval);
          peerConnectionInterval = null;
        }
        peer.disconnect();
        peer.destroy();
        peer = null;
      }
    };
  }, [handleConnect, recalculateLayout, settings]);

  function handleDisconnect() {
    const streams = document.getElementsByTagName(
      "video"
    ) as HTMLCollectionOf<HTMLMediaElement>;
    for (let i = 0; i <= streams.length; i++) {
      const stream = streams[i];
      if (stream) {
        stream.remove();
        console.log(`Stream removed: ${stream.id}`);
      }
    }
    debouncedRecalculateLayout();
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    if (peer) {
      peer.disconnect();
      peer.destroy();
      updateStreams();
    }
    setTimeout(() => {
      peer = null;
      handleConnect();
    }, 2000);
  }

  return (
    <>
      <div className={classes.root} id="stream-container" />
      <Fab
        className={classes.button}
        aria-label="End Call"
        color="primary"
        onClick={handleDisconnect}
      >
        <Icon title="End Call" size={1} path={mdiPhoneHangup} />
      </Fab>
    </>
  );
}

export default WebRTC;
