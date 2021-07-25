import { speaker } from "win-audio";

export async function getVolume(): Promise<number> {
  return await speaker.get();
}
export async function setVolume(value: number): Promise<void> {
  return await speaker.set(value);
}
export async function isMuted(): Promise<boolean> {
  return await speaker.isMuted();
}
export async function setMuted(muted: boolean): Promise<boolean | void> {
  return muted ? await speaker.mute() : await speaker.unmute();
}

export default { getVolume, setVolume, isMuted, setMuted };
