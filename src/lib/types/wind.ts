export interface WindGrid {
  west: number;
  south: number;
  east: number;
  north: number;
  cols: number;
  rows: number;
  dx: number;
  dy: number;
  u: Float32Array;
  v: Float32Array;
  speed: Float32Array;
  timestamp: number;
}

export interface ViewportBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}
