declare module "brightness" {
  const get: () => Promise<number>;
  const set: (value: number) => Promise<void>;
}
