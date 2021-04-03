import React, { ReactElement, useEffect } from "react";
import Peer from "peerjs";

import { Configuration } from "../../src/configuration";
import { useSettings } from "./Utils";

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
    (async () => {
      console.log("Create peer");
      const peer = new Peer();

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

          // const video = document.getElementById(
          //   "video-stream"
          // ) as HTMLMediaElement;
          // video.srcObject = mediaStream;
          // video.load();
        } catch (err) {
          console.error(err);
        }
      });
    })();
  }, []);

  return <></>;
}

export default Main;
