import { Logger } from "../../../logger";

const logger = new Logger("AudioData");

function getImpl(platform: string): any {
  switch (platform) {
    case "linux":
    case "darwin":
      return require("./unix");
    case "win32":
      return require("./win32");
    default:
      throw new Error("Unsupported platform: " + platform);
  }
}

const impl = getImpl(process.platform);

export async function muted(value?: boolean): Promise<boolean> {
  return value ? impl.setMuted(value) : impl.isMuted();
}

export async function volume(value?: number): Promise<number> {
  return value ? impl.setVolume(value) : impl.getVolume();
}

export async function getCurrent(): Promise<{
  muted?: boolean;
  volume?: number;
}> {
  try {
    return {
      muted: await muted(),
      volume: await volume(),
    };
  } catch (e) {
    logger.warn(`Cannot get current audio: ${e.message}`);
  }
  return {};
}
