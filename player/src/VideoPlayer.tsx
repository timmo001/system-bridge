import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactPlayer from "react-player/lazy";

import { VideoSource } from "./Main";

interface VideoPlayerProps {
  source: VideoSource;
}

function VideoPlayer({ source }: VideoPlayerProps) {
  const { source: videoSrc, volumeInitial } = source;

  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const handleTogglePlaying = useCallback(() => setIsPlaying(!isPlaying), [
    isPlaying,
  ]);

  useEffect(() => {
    window.api.ipcRendererOn("player-pause", () => setIsPlaying(false));
    window.api.ipcRendererOn("player-play", () => setIsPlaying(true));
    window.api.ipcRendererOn("player-playpause", handleTogglePlaying);
  }, [handleTogglePlaying]);

  const volume = useMemo(() => volumeInitial / 100, [volumeInitial]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        playing={isPlaying}
        height="100%"
        width="100%"
        url={videoSrc}
        volume={volume}
      />
    </>
  );
}

export default VideoPlayer;
