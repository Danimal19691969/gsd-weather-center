import { NextRequest, NextResponse } from "next/server";
import { classifyPrecipType } from "@/lib/precip/precipClassifier";
import { getPrecipIntensity } from "@/lib/precip/precipIntensity";
import { precipToColor } from "@/lib/precip/precipColorScale";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import {
  generateGridPoints,
  gridCacheKey,
  type ViewportBounds,
} from "@/lib/precip/precipGrid";
import type { PrecipType } from "@/lib/precip/precipClassifier";
import type { PrecipIntensity } from "@/lib/precip/precipIntensity";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PrecipGridCell {
  lat: number;
  lon: number;
  hours: PrecipHourCell[];
}

interface PrecipHourCell {
  precipitation: number;
  type: PrecipType;
  intensity: PrecipIntensity;
  color: string;
}

// ---------------------------------------------------------------------------
// HMR-safe cache
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 30 * 60 * 1_000; // 30 min
const STATE_KEY = "__precipGridCacheState";

interface CacheEntry {
  data: PrecipGridCell;
  expiry: number;
}

interface GridCacheState {
  cache: Map<string, CacheEntry>;
  inflight: Map<string, Promise<PrecipGridCell>>;
}

function getState(): GridCacheState {
  const g = globalThis as Record<string, unknown>;
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = { cache: new Map(), inflight: new Map() };
  }
  return g[STATE_KEY] as GridCacheState;
}

// ---------------------------------------------------------------------------
// Open-Meteo fetch for a single point (168 hours)
// ---------------------------------------------------------------------------
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

async function fetchPointPrecip(lat: number, lon: number): Promise<PrecipGridCell> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "precipitation,rain,snowfall,showers,temperature_2m,weather_code",
    forecast_days: "7",
    timezone: "auto",
  });

  const res = await fetchWithRetry(`${OPEN_METEO_BASE}/forecast?${params}`, {
    retries: 3,
    baseDelayMs: 1000,
    next: { revalidate: 600 },
  } as Parameters<typeof fetchWithRetry>[1]);

  const json = await res.json();
  const h = json.hourly;

  const hours: PrecipHourCell[] = h.time.map((_: string, i: number) => {
    const precipitation = h.precipitation[i] ?? 0;
    const rain = h.rain[i] ?? 0;
    const snowfall = h.snowfall[i] ?? 0;
    const temp = h.temperature_2m[i] ?? 20;

    const type = classifyPrecipType({ temp, precipitation, snowfall, rain });
    const intensity = getPrecipIntensity(precipitation);
    const color = precipToColor(type, intensity);

    return { precipitation, type, intensity, color };
  });

  return { lat, lon, hours };
}

// ---------------------------------------------------------------------------
// Cached + deduped fetch for a single grid point
// ---------------------------------------------------------------------------
async function fetchCachedPoint(
  lat: number,
  lon: number,
  state: GridCacheState
): Promise<PrecipGridCell> {
  const key = gridCacheKey(lat, lon);

  // Fresh cache hit
  const cached = state.cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Dedup inflight
  let pending = state.inflight.get(key);
  if (!pending) {
    const raw = fetchPointPrecip(lat, lon);
    pending = raw.finally(() => state.inflight.delete(key));
    state.inflight.set(key, pending);
  }

  try {
    const data = await pending;
    state.cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    // Serve stale cache on upstream failure
    if (cached) {
      console.log(`[precip] stale cache fallback for ${key}`);
      return cached.data;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// GET /api/precipitation/grid?west=X&south=Y&east=Z&north=W&zoom=N
// ---------------------------------------------------------------------------
const HEADERS = { "Cache-Control": "public, s-maxage=300" };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const west = parseFloat(searchParams.get("west") ?? "");
  const south = parseFloat(searchParams.get("south") ?? "");
  const east = parseFloat(searchParams.get("east") ?? "");
  const north = parseFloat(searchParams.get("north") ?? "");
  const zoom = parseFloat(searchParams.get("zoom") ?? "8");

  if ([west, south, east, north].some(isNaN)) {
    return NextResponse.json(
      { ok: false, error: "west, south, east, north are required" },
      { status: 400 }
    );
  }

  const bounds: ViewportBounds = { west, south, east, north };
  const gridPoints = generateGridPoints(bounds, zoom);

  if (gridPoints.length === 0) {
    return NextResponse.json(
      { ok: true, served: "fresh", data: [] },
      { headers: HEADERS }
    );
  }

  const state = getState();

  try {
    // Fetch all grid points concurrently (cache + dedup prevents flooding)
    const cells = await Promise.all(
      gridPoints.map((p) => fetchCachedPoint(p.lat, p.lon, state))
    );

    return NextResponse.json(
      { ok: true, served: "fresh", data: cells },
      { headers: HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200, headers: HEADERS }
    );
  }
}
