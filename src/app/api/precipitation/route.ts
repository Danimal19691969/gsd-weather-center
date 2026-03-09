import { NextRequest, NextResponse } from "next/server";
import { classifyPrecipType } from "@/lib/precip/precipClassifier";
import { getPrecipIntensity } from "@/lib/precip/precipIntensity";
import { precipToColor } from "@/lib/precip/precipColorScale";
import type { HourlyPrecipData } from "@/lib/types/precipitation";

const CACHE_TTL_MS = 10 * 60 * 1_000;
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

const STATE_KEY = "__precipCacheState";
interface CacheState {
  cache: Map<string, { data: HourlyPrecipData[]; expiry: number }>;
  inflight: Map<string, Promise<HourlyPrecipData[]>>;
}

function getState(): CacheState {
  const g = globalThis as Record<string, unknown>;
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = { cache: new Map(), inflight: new Map() };
  }
  return g[STATE_KEY] as CacheState;
}

const HEADERS = { "Cache-Control": "public, s-maxage=300" };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { ok: false, error: "lat and lon are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { ok: false, error: "lat must be -90..90, lon must be -180..180" },
      { status: 400 }
    );
  }

  const state = getState();
  const key = `${lat}_${lon}`;

  // Check cache
  const cached = state.cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(
      { ok: true, served: "fresh", data: cached.data },
      { headers: HEADERS }
    );
  }

  // Dedup inflight
  let pending = state.inflight.get(key);
  if (!pending) {
    pending = fetchPrecipData(lat, lon);
    state.inflight.set(key, pending);
    pending.finally(() => state.inflight.delete(key));
  }

  try {
    const data = await pending;
    state.cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(
      { ok: true, served: "fresh", data },
      { headers: HEADERS }
    );
  } catch (err) {
    // Serve stale if available
    if (cached) {
      return NextResponse.json(
        { ok: true, served: "stale", data: cached.data },
        { headers: HEADERS }
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200, headers: HEADERS }
    );
  }
}

async function fetchPrecipData(lat: number, lon: number): Promise<HourlyPrecipData[]> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      "precipitation", "rain", "snowfall", "showers",
      "temperature_2m", "weather_code",
    ].join(","),
    forecast_days: "7",
    timezone: "auto",
  });

  const res = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, {
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo returned ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const h = json.hourly;

  return h.time.map((time: string, i: number) => {
    const precipitation = h.precipitation[i];
    const rain = h.rain[i];
    const snowfall = h.snowfall[i];
    const temp = h.temperature_2m[i];

    const type = classifyPrecipType({
      temp,
      precipitation,
      snowfall,
      rain,
    });

    const intensity = getPrecipIntensity(precipitation);
    const color = precipToColor(type, intensity);

    return {
      time,
      precipitation,
      rain,
      snowfall,
      showers: h.showers[i],
      temperature: temp,
      weatherCode: h.weather_code[i],
      type,
      intensity,
      color,
    };
  });
}
