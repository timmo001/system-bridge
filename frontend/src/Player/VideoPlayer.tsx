import React, { useCallback, useMemo } from "react";
import ReactPlayer from "react-player/lazy";

import { usePlayer, VideoSource } from "./Utils";

function VideoPlayer() {
  const [playerStatus, setPlayerStatus] = usePlayer();

  const { source, volumeInitial } = useMemo(() => playerStatus!!.source, [
    playerStatus,
  ]) as VideoSource;
  const isPlaying = useMemo(() => playerStatus!!.playing, [playerStatus]);

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  return (
    <>
      <ReactPlayer
        controls
        pip
        playing={isPlaying}
        height="100%"
        width="100%"
        url={source}
        volume={volumeInitial}
        handleSetPlaying={handleSetPlaying}
      />
    </>
  );
}

export default VideoPlayer;
