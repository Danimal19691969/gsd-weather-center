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
   * Each pixel is mapped to a lat/lon via the projector, then interpolated.
   *
   * For performance, renders at RENDER_STEP pixel intervals and fills blocks.
   */
  renderToBuffer(
    width: number,
    height: number,
    projector: Projector
  ): Uint8ClampedArray {
    // Render at reduced resolution for performance, then fill blocks
    const STEP = 4;
    const buf = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y += STEP) {
      for (let x = 0; x < width; x += STEP) {
        const geo = projector.unproject([x, y]);
        const s = this.sample(geo.lat, geo.lng);

        if (!s || s.value <= 0) continue;

        const r = s.r;
        const g = s.g;
        const b = s.b;
        const a = Math.round(s.alpha * 255);

        // Fill the STEP×STEP block
        for (let dy = 0; dy < STEP && y + dy < height; dy++) {
          for (let dx = 0; dx < STEP && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            buf[idx] = r;
            buf[idx + 1] = g;
            buf[idx + 2] = b;
            buf[idx + 3] = a;
          }
        }
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
