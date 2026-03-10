export interface PrecipSample {
  lat: number;
  lon: number;
  value: number; // mm/hr
  color: string; // hex color or "transparent"
}

export interface FieldBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

interface InterpolatedSample {
  value: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
}

interface Projector {
  unproject(point: [number, number]): { lat: number; lng: number };
}

function parseHexColor(hex: string): [number, number, number] {
  if (hex === "transparent" || hex.length < 7) return [0, 0, 0];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Precipitation value → alpha (0–1). Smooth ramp from 0 at 0 mm/hr to ~0.8 at heavy.
function valueToAlpha(value: number): number {
  if (value <= 0) return 0;
  // Logarithmic ramp for natural-looking fade
  return Math.min(0.8, 0.15 + 0.25 * Math.log2(1 + value));
}

/**
 * Sparse precipitation field with bilinear interpolation.
 *
 * Stores samples on a regular lat/lon grid and provides smooth
 * interpolation between samples for heatmap rendering.
 */
export class PrecipField {
  private samples: PrecipSample[];
  private _bounds: FieldBounds;

  // Internal regular grid for fast lookup
  private gridLats: number[] = [];
  private gridLons: number[] = [];
  private grid: Map<string, PrecipSample> = new Map();

  constructor(samples: PrecipSample[]) {
    this.samples = samples;

    // Compute bounds
    let south = Infinity, north = -Infinity;
    let west = Infinity, east = -Infinity;
    for (const s of samples) {
      if (s.lat < south) south = s.lat;
      if (s.lat > north) north = s.lat;
      if (s.lon < west) west = s.lon;
      if (s.lon > east) east = s.lon;
    }
    this._bounds = { south, north, west, east };

    // Build sorted unique lat/lon arrays and lookup map
    const latSet = new Set<number>();
    const lonSet = new Set<number>();
    for (const s of samples) {
      latSet.add(s.lat);
      lonSet.add(s.lon);
      this.grid.set(`${s.lat}_${s.lon}`, s);
    }
    this.gridLats = [...latSet].sort((a, b) => a - b);
    this.gridLons = [...lonSet].sort((a, b) => a - b);
  }

  get bounds(): FieldBounds {
    return this._bounds;
  }

  /**
   * Bilinear interpolation at an arbitrary lat/lon.
   * Returns null if outside grid coverage.
   */
  sample(lat: number, lon: number): InterpolatedSample | null {
    const { gridLats, gridLons } = this;
    if (gridLats.length < 2 || gridLons.length < 2) return null;

    // Find bounding row indices
    const ri = this.findInterval(gridLats, lat);
    const ci = this.findInterval(gridLons, lon);
    if (ri < 0 || ci < 0) return null;

    const lat0 = gridLats[ri];
    const lat1 = gridLats[ri + 1];
    const lon0 = gridLons[ci];
    const lon1 = gridLons[ci + 1];

    // Get four corner samples
    const s00 = this.grid.get(`${lat0}_${lon0}`);
    const s10 = this.grid.get(`${lat0}_${lon1}`);
    const s01 = this.grid.get(`${lat1}_${lon0}`);
    const s11 = this.grid.get(`${lat1}_${lon1}`);

    if (!s00 || !s10 || !s01 || !s11) return null;

    // Fractional position within cell
    const fLat = lat1 !== lat0 ? (lat - lat0) / (lat1 - lat0) : 0;
    const fLon = lon1 !== lon0 ? (lon - lon0) / (lon1 - lon0) : 0;

    // Bilinear interpolation of value
    const value =
      s00.value * (1 - fLat) * (1 - fLon) +
      s10.value * (1 - fLat) * fLon +
      s01.value * fLat * (1 - fLon) +
      s11.value * fLat * fLon;

    // Bilinear interpolation of color channels
    const c00 = parseHexColor(s00.color);
    const c10 = parseHexColor(s10.color);
    const c01 = parseHexColor(s01.color);
    const c11 = parseHexColor(s11.color);

    // Weight by value to avoid blending transparent (zero-precip) colors
    const w00 = s00.value * (1 - fLat) * (1 - fLon);
    const w10 = s10.value * (1 - fLat) * fLon;
    const w01 = s01.value * fLat * (1 - fLon);
    const w11 = s11.value * fLat * fLon;
    const wSum = w00 + w10 + w01 + w11;

    let r: number, g: number, b: number;
    if (wSum > 0) {
      r = (c00[0] * w00 + c10[0] * w10 + c01[0] * w01 + c11[0] * w11) / wSum;
      g = (c00[1] * w00 + c10[1] * w10 + c01[1] * w01 + c11[1] * w11) / wSum;
      b = (c00[2] * w00 + c10[2] * w10 + c01[2] * w01 + c11[2] * w11) / wSum;
    } else {
      r = 0; g = 0; b = 0;
    }

    return {
      value,
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
      alpha: valueToAlpha(value),
    };
  }

  /**
   * Render to an RGBA pixel buffer for use with ImageData.
   * Each pixel is mapped to a lat/lon via the projector, then bilinearly
   * interpolated for smooth gradients.
   *
   * For performance, samples at STEP-pixel intervals and bilinearly
   * interpolates between samples to fill every pixel smoothly.
   */
  renderToBuffer(
    width: number,
    height: number,
    projector: Projector
  ): Uint8ClampedArray {
    const STEP = 4;
    const buf = new Uint8ClampedArray(width * height * 4);

    // Number of sample columns/rows (one extra to cover the rightmost/bottom pixels)
    const sampCols = Math.ceil(width / STEP) + 1;
    const sampRows = Math.ceil(height / STEP) + 1;

    // Pre-sample at grid points
    const sR = new Float32Array(sampCols * sampRows);
    const sG = new Float32Array(sampCols * sampRows);
    const sB = new Float32Array(sampCols * sampRows);
    const sA = new Float32Array(sampCols * sampRows);

    for (let sy = 0; sy < sampRows; sy++) {
      for (let sx = 0; sx < sampCols; sx++) {
        const px = Math.min(sx * STEP, width - 1);
        const py = Math.min(sy * STEP, height - 1);
        const geo = projector.unproject([px, py]);
        const s = this.sample(geo.lat, geo.lng);
        const idx = sy * sampCols + sx;
        if (s && s.value > 0) {
          sR[idx] = s.r;
          sG[idx] = s.g;
          sB[idx] = s.b;
          sA[idx] = s.alpha * 255;
        }
        // else stays 0 (transparent)
      }
    }

    // Bilinearly interpolate between sample points for every pixel
    for (let y = 0; y < height; y++) {
      const sy = y / STEP;
      const sy0 = Math.min(Math.floor(sy), sampRows - 2);
      const sy1 = sy0 + 1;
      const fy = sy - sy0;

      for (let x = 0; x < width; x++) {
        const sx = x / STEP;
        const sx0 = Math.min(Math.floor(sx), sampCols - 2);
        const sx1 = sx0 + 1;
        const fx = sx - sx0;

        const i00 = sy0 * sampCols + sx0;
        const i10 = sy0 * sampCols + sx1;
        const i01 = sy1 * sampCols + sx0;
        const i11 = sy1 * sampCols + sx1;

        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        const a = sA[i00] * w00 + sA[i10] * w10 + sA[i01] * w01 + sA[i11] * w11;
        if (a < 1) continue; // fully transparent

        const r = sR[i00] * w00 + sR[i10] * w10 + sR[i01] * w01 + sR[i11] * w11;
        const g = sG[i00] * w00 + sG[i10] * w10 + sG[i01] * w01 + sG[i11] * w11;
        const b = sB[i00] * w00 + sB[i10] * w10 + sB[i01] * w01 + sB[i11] * w11;

        const idx = (y * width + x) * 4;
        buf[idx] = Math.round(r);
        buf[idx + 1] = Math.round(g);
        buf[idx + 2] = Math.round(b);
        buf[idx + 3] = Math.round(a);
      }
    }

    return buf;
  }

  /**
   * Find the index i such that arr[i] <= val < arr[i+1].
   * Returns -1 if out of range.
   */
  private findInterval(arr: number[], val: number): number {
    if (val < arr[0] || val > arr[arr.length - 1]) return -1;
    for (let i = 0; i < arr.length - 1; i++) {
      if (val >= arr[i] && val <= arr[i + 1]) return i;
    }
    return -1;
  }
}
