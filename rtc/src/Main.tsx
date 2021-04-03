import React, { ReactElement, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Peer from "peerjs";

import { Configuration } from "../../src/configuration";
import { useSettings } from "./Utils";

let peer: Peer,
  peerConnectionInterval: NodeJS.Timeout,
  mediaStream: MediaStream | null;
function Main(): ReactElement {
  const [settings, setSettings] = useSettings();

  useEffect(() => {
    if (!settings) {
      window.api.ipcRendererOn("set-settings", (_event, args) => {
        console.log("set-settings:", args);
        const s: Configuration = args;
        setSettings(s);
      });
      window.api.ipcRendererSend("get-settings");
    }
  }, [settings, setSettings]);

  useEffect(() => {
    if (settings)
      (async () => {
        const config = {
          host: "localhost",
          key: String(settings?.network.items.apiKey.value),
          path: "/rtc",
          port: Number(settings?.network.items.port.value),
        };
        console.log("Create peer:", config);
        peer = new Peer(`host-${uuidv4()}`, config);

        peer.on("open", (id) => {
          console.log("My peer ID is: " + id);
        });
        peer.on("connection", (dataConnection: Peer.DataConnection) => {
          console.log("New connection from ", dataConnection.peer);
        });
        peer.on("call", async (mediaConnection: Peer.MediaConnection) => {
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
                clearInterval(peerConnectionInterval);
              }
            });
          }, 2000);
        });
      })();
    return () => {
      if (peer) {
        if (peerConnectionInterval) clearInterval(peerConnectionInterval);
        peer.disconnect();
        peer.destroy();
      }
    };
  }, [settings]);

  return (
    <>
      <video id="video-stream" />
    </>
  );
}

export default Main;
