import type { WindGrid } from "@/lib/types/wind";

export class WindField {
  private grid: WindGrid;

  constructor(grid: WindGrid) {
    this.grid = grid;
  }

  get bounds() {
    return {
      west: this.grid.west,
      south: this.grid.south,
      east: this.grid.east,
      north: this.grid.north,
    };
  }

  interpolate(lat: number, lon: number): [number, number] | null {
    const { west, south, dx, dy, cols, rows, u, v } = this.grid;

    const col = (lon - west) / dx;
    const row = (lat - south) / dy;

    if (col < 0 || col >= cols - 1 || row < 0 || row >= rows - 1) return null;

    const c0 = Math.floor(col);
    const r0 = Math.floor(row);
    const fc = col - c0;
    const fr = row - r0;

    const i00 = r0 * cols + c0;
    const i10 = r0 * cols + (c0 + 1);
    const i01 = (r0 + 1) * cols + c0;
    const i11 = (r0 + 1) * cols + (c0 + 1);

    const uInterp =
      u[i00] * (1 - fc) * (1 - fr) +
      u[i10] * fc * (1 - fr) +
      u[i01] * (1 - fc) * fr +
      u[i11] * fc * fr;

    const vInterp =
      v[i00] * (1 - fc) * (1 - fr) +
      v[i10] * fc * (1 - fr) +
      v[i01] * (1 - fc) * fr +
      v[i11] * fc * fr;

    return [uInterp, vInterp];
  }
}
