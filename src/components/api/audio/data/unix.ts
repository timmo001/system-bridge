import loudness from "loudness";

export async function getVolume(): Promise<number> {
  return await loudness.getVolume();
}
export async function setVolume(value: number): Promise<void> {
  return await loudness.setVolume(value);
}
export async function isMuted(): Promise<boolean> {
  return await loudness.getMuted();
}
export async function setMuted(muted: boolean): Promise<boolean | void> {
  return muted ? await loudness.setMuted(muted) : await loudness.getMuted();
}

export default { getVolume, setVolume, isMuted, setMuted };
