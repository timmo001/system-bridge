import React, { ReactElement, useEffect } from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core";
import { v4 as uuidv4 } from "uuid";
import Peer from "peerjs";

import { useSettings } from "../Utils";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    stream: {
      flex: 1,
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
          console.log("New connection from ", dataConnection.peer);
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

            const video = document.getElementById(
              "video-stream"
            ) as HTMLMediaElement;
            video.srcObject = mediaStream;
            video.play();
          } catch (err) {
            console.error(err);
          }

          peerConnectionInterval = setInterval(() => {
            peer.listAllPeers((peerIds: string[]) => {
              if (peerIds.length === 1) {
                console.log("No more peers. Closing stream");
                const video = document.getElementById(
                  "video-stream"
                ) as HTMLMediaElement;
                video.srcObject = null;
                mediaStream?.getTracks().forEach((track) => track.stop());
                mediaStream = null;
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
  }, [settings]);

  return (
    <>
      <video className={classes.stream} id="video-stream" />
    </>
  );
}

export default WebRTC;
