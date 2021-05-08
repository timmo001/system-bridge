import React, { useCallback, useMemo } from "react";
import ReactPlayer from "react-player/lazy";

import { useVideoPlayer, VideoSource } from "./Utils";

function VideoPlayer() {
  const [playerStatus, setPlayerStatus] = useVideoPlayer();

  const videoSource = useMemo<VideoSource>(() => playerStatus!!.source, [
    playerStatus,
  ]);
  const isPlaying = useMemo(() => playerStatus!!.playing, [playerStatus]);

  const { source, volumeInitial } = videoSource;

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const volume = useMemo(() => volumeInitial / 100, [volumeInitial]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        playing={isPlaying}
        height="100%"
        width="100%"
        url={source}
        volume={volume}
        handleSetPlaying={handleSetPlaying}
      />
    </>
  );
}

export default VideoPlayer;
