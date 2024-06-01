export interface MemorySwap {
  total?: number;
  used?: number;
  free?: number;
  percent?: number;
  sin?: number;
  sout?: number;
}

export interface MemoryVirtual {
  total?: number;
  available?: number;
  percent?: number;
  used?: number;
  free?: number;
  active?: number;
  inactive?: number;
  buffers?: number;
  cached?: number;
  wired?: number;
  shared?: number;
}

export interface Memory {
  swap: MemorySwap;
  virtual: MemoryVirtual;
}
