interface Vars {
  width: number;
  height: number;
  cols: number;
}

declare module "rect-scaler" {
  export const largestSquare = (
    containerWidth: number,
    containerHeight: number,
    count: number,
    aspectRatio: number
  ) => Vars;
  export const largestRect = (
    containerWidth: number,
    containerHeight: number,
    count: number,
    aspectRatio: number
  ) => Vars;
}
