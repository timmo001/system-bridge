import React, { ReactElement, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Peer from "peerjs";

import { Configuration } from "../../src/configuration";
import { useSettings } from "./Utils";

let peer: Peer;
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

        peer.on("call", async (call) => {
          try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true,
            });
            // Answer the call, providing our mediaStream
            call.answer(mediaStream);

            const video = document.getElementById(
              "video-stream"
            ) as HTMLMediaElement;
            video.srcObject = mediaStream;
            video.load();
          } catch (err) {
            console.error(err);
          }
        });
      })();
    return () => {
      if (peer) {
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
