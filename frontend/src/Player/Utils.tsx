import React, {
  createContext,
  ReactElement,
  useContext,
  useState,
} from "react";

export interface Source {
  type: "audio" | "video";
  source: string;
  volumeInitial: number;
}

export interface AudioSource extends Source {
  type: "audio";
  album: string;
  artist: string;
  cover: string;
  title: string;
}

export interface VideoSource extends Source {
  type: "video";
}

export interface AudioPlayerStatus {
  playing?: boolean;
  source: AudioSource;
}

export interface VideoPlayerStatus {
  playing?: boolean;
  source: VideoSource;
}

const PlayerContext = createContext<
  AudioPlayerStatus | VideoPlayerStatus | undefined
>(undefined);
const SetPlayerContext = createContext<null | React.Dispatch<
  React.SetStateAction<AudioPlayerStatus | VideoPlayerStatus | undefined>
>>(null);

const AudioPlayerContext = createContext<AudioPlayerStatus | undefined>(
  undefined
);
const SetAudioPlayerContext = createContext<null | React.Dispatch<
  React.SetStateAction<AudioPlayerStatus>
>>(null);

const VideoPlayerContext = createContext<VideoPlayerStatus | undefined>(
  undefined
);
const SetVideoPlayerContext = createContext<null | React.Dispatch<
  React.SetStateAction<VideoPlayerStatus>
>>(null);

export const PlayerProvider = ({
  children,
}: {
  children: ReactElement;
}): ReactElement => {
  const [playerStatus, setPlayerStatus] = useState<
    AudioPlayerStatus | VideoPlayerStatus
  >();

  return (
    <SetPlayerContext.Provider value={setPlayerStatus}>
      <PlayerContext.Provider value={playerStatus}>
        {children}
      </PlayerContext.Provider>
    </SetPlayerContext.Provider>
  );
};

export const usePlayer = (): [
  player: AudioPlayerStatus | VideoPlayerStatus | undefined,
  setPlayer: React.Dispatch<
    React.SetStateAction<AudioPlayerStatus | VideoPlayerStatus | undefined>
  >
] => {
  const player = useContext(PlayerContext);
  const setPlayer = useContext(SetPlayerContext);
  if (setPlayer === null) throw new Error(); // this will make setPlayer non-null
  return [player, setPlayer];
};

export const useAudioPlayer = (): [
  player: AudioPlayerStatus | undefined,
  setPlayer: React.Dispatch<React.SetStateAction<AudioPlayerStatus>>
] => {
  const player = useContext(AudioPlayerContext);
  const setPlayer = useContext(SetAudioPlayerContext);
  if (setPlayer === null) throw new Error(); // this will make setPlayer non-null
  return [player, setPlayer];
};

export const useVideoPlayer = (): [
  player: VideoPlayerStatus | undefined,
  setPlayer: React.Dispatch<React.SetStateAction<VideoPlayerStatus>>
] => {
  const player = useContext(VideoPlayerContext);
  const setPlayer = useContext(SetVideoPlayerContext);
  if (setPlayer === null) throw new Error(); // this will make setPlayer non-null
  return [player, setPlayer];
};
