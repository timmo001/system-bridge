import React, { useEffect } from "react";
import Peer from "peerjs";

function Webcam() {
  useEffect(() => {
    (async () => {
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
  }, []);

  return (
    <>
      <video id="video-stream" controls width="1920" height="1080"></video>
    </>
  );
}

export default Webcam;
