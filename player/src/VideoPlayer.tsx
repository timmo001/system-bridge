import React, { useMemo } from "react";
import ReactPlayer from "react-player/lazy";

import { VideoSource } from "./Main";

interface VideoPlayerProps {
  hovering: boolean;
  source: VideoSource;
}

function AudioPlayer({ hovering, source }: VideoPlayerProps) {
  const { source: videoSrc, volumeInitial } = source;

  const volume = useMemo(() => volumeInitial / 100, [volumeInitial]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        playing
        height="100%"
        width="100%"
        url={videoSrc}
        volume={volume}
      />
    </>
  );
}

export default AudioPlayer;
