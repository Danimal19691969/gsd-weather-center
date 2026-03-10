import { cachedFetch } from "@/lib/cache";
import { fetchWithRetry, isBackoffActive, type RetryOptions } from "@/lib/fetchWithRetry";
import type { WindGrid, ViewportBounds } from "@/lib/types/wind";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const GRID_SIZE = 12;
const WIND_CACHE_TTL = 5 * 60_000; // 5 minutes

export async function fetchWindGrid(bounds: ViewportBounds): Promise<WindGrid> {
  const west = Math.floor(bounds.west * 10) / 10;
  const east = Math.ceil(bounds.east * 10) / 10;
  const south = Math.floor(bounds.south * 10) / 10;
  const north = Math.ceil(bounds.north * 10) / 10;

  const dx = (east - west) / (GRID_SIZE - 1);
  const dy = (north - south) / (GRID_SIZE - 1);

  const lats: number[] = [];
  const lons: number[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      lats.push(+(south + row * dy).toFixed(4));
      lons.push(+(west + col * dx).toFixed(4));
    }
  }

  const cacheKey = `wind:grid:${west}:${south}:${east}:${north}`;

  const json = await cachedFetch(
    cacheKey,
    async () => {
      // Fail fast if global backoff is active — cachedFetch will serve stale
      if (isBackoffActive()) {
        throw new Error("Global backoff active — skipping upstream request");
      }

      const params = new URLSearchParams({
        latitude: lats.join(","),
        longitude: lons.join(","),
        current: "wind_speed_10m,wind_direction_10m",
      });
      const res = await fetchWithRetry(`${OPEN_METEO_BASE}/forecast?${params}`, {
        retries: 3,
        baseDelayMs: 1000,
        next: { revalidate: 600 },
      } as RetryOptions & RequestInit);
      return res.json();
    },
    WIND_CACHE_TTL
  );

  const results: Array<{ current: { wind_speed_10m: number; wind_direction_10m: number } }> =
    Array.isArray(json) ? json : [json];

  const u = new Float32Array(GRID_SIZE * GRID_SIZE);
  const v = new Float32Array(GRID_SIZE * GRID_SIZE);
  const speed = new Float32Array(GRID_SIZE * GRID_SIZE);

  for (let i = 0; i < results.length; i++) {
    const current = results[i].current;
    const ws = current.wind_speed_10m / 3.6; // km/h -> m/s
    const wd = current.wind_direction_10m;
    const rad = ((wd + 180) * Math.PI) / 180;

    u[i] = ws * Math.sin(rad);
    v[i] = ws * Math.cos(rad);
    speed[i] = ws;
  }

  return {
    west, south, east, north,
    cols: GRID_SIZE, rows: GRID_SIZE,
    dx, dy, u, v, speed,
    timestamp: Date.now(),
  };
}
