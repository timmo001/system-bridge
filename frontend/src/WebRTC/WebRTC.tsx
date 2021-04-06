import React, { ReactElement, useEffect } from "react";
import { createStyles, makeStyles } from "@material-ui/core";
import { v4 as uuidv4 } from "uuid";
import Peer from "peerjs";
import debounce from "lodash/debounce";
import { largestRect } from "rect-scaler";

import { useSettings } from "../Utils";

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      maxWidth: "calc(var(--width) * var(--cols))",
      display: "flex",
      flexWrap: "wrap",
      alignContent: "center",
      alignItems: "center",
      justifyContent: "center",
      verticalAlign: "middle",
    },
    stream: {
      width: "var(--width)",
      height: "var(--height)",
      display: "inline-block",
      verticalAlign: "middle",
      alignSelf: "center",
      animation: "show 0.4s ease",
      overflow: "hidden",
    },
  })
);

let peer: Peer,
  peerConnectionInterval: NodeJS.Timeout | null,
  mediaStream: MediaStream | null;

function WebRTC(): ReactElement {
  const [settings] = useSettings();

  const classes = useStyles();

  useEffect(() => {
    if (settings)
      (async () => {
        const debouncedRecalculateLayout = debounce(recalculateLayout, 50);
        window.addEventListener("resize", debouncedRecalculateLayout);

        const config = {
          host: "localhost",
          key: String(settings?.network.items.apiKey.value),
          path: "/rtc",
          port: Number(settings?.network.items.port.value),
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
            window.api.ipcRendererSend("window-show");
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
          peerConnectionInterval = setInterval(() => {
            peer.listAllPeers((peerIds: string[]) => {
              const streams = document.getElementsByClassName(
                classes.stream
              ) as HTMLCollectionOf<HTMLMediaElement>;
              for (let i = 0; i < streams.length; i++) {
                const video = streams.item(i);
                if (
                  video &&
                  video?.id !== "stream-host" &&
                  !peerIds.includes(video.id.replace("stream-", ""))
                )
                  video.remove();
              }

              if (peerIds.length === 1) {
                console.log("No more peers. Closing stream");
                mediaStream?.getTracks().forEach((track) => track.stop());
                mediaStream = null;
                const video = document.getElementById(
                  "stream-host"
                ) as HTMLMediaElement;
                video.remove();
                if (peerConnectionInterval)
                  clearInterval(peerConnectionInterval);
                peerConnectionInterval = null;
                try {
                  window.api.ipcRendererSend("window-hide");
                } catch (e) {
                  console.warn("Error calling window.api:", e);
                }
              }
            });
          }, 2000);
        });
      })();

    function recalculateLayout() {
      const streamContainer = document.getElementById(
        "stream-container"
      ) as HTMLDivElement;
      const aspectRatio = 16 / 9;
      const screenWidth = document.body.getBoundingClientRect().width;
      const screenHeight = document.body.getBoundingClientRect().height;
      const videoCount = document.getElementsByClassName(classes.stream).length;

      const { width, height, cols } = largestRect(
        screenWidth,
        screenHeight,
        videoCount,
        aspectRatio
      );

      streamContainer.style.setProperty("--width", width + "px");
      streamContainer.style.setProperty("--height", height + "px");
      streamContainer.style.setProperty("--cols", cols + "");
    }

    return () => {
      if (peer) {
        if (peerConnectionInterval) {
          clearInterval(peerConnectionInterval);
          peerConnectionInterval = null;
        }
        peer.disconnect();
        peer.destroy();
      }
    };
  }, [classes.stream, settings]);

  return <div className={classes.root} id="stream-container" />;
}

export default WebRTC;
