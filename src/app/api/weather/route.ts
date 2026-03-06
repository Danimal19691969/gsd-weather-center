import { NextRequest, NextResponse } from "next/server";
import type { AllWeatherData } from "@/lib/tools/weather";
import type { ToolResult } from "@/lib/types/tool-result";
import type { MarineWeather } from "@/lib/types/weather";

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 10 * 60 * 1_000; // 10 minutes fresh
const RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1_000; // 15 minutes after 429

// ---------------------------------------------------------------------------
// In-memory cache — entries are NEVER deleted, only refreshed.
// Stale entries are served when upstream fails.
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T;
  expiry: number;
  lastSuccess: number;
}

const weatherCache = new Map<string, CacheEntry<AllWeatherData>>();
const marineCache = new Map<string, CacheEntry<MarineWeather>>();
const inflight = new Map<string, Promise<unknown>>();

// Rate-limit lockout per upstream service
const rateLimitUntil = new Map<string, number>();

function getFresh<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  return entry && entry.expiry > Date.now() ? entry.data : null;
}

function getStale<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  return entry ? entry.data : null;
}

function setEntry<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS, lastSuccess: Date.now() });
}

function isBackoffActive(service: string): boolean {
  const until = rateLimitUntil.get(service);
  if (!until) return false;
  if (Date.now() >= until) {
    rateLimitUntil.delete(service);
    return false;
  }
  return true;
}

function activateBackoff(service: string): void {
  console.log("OPENMETEO RATE LIMITED", service);
  rateLimitUntil.set(service, Date.now() + RATE_LIMIT_BACKOFF_MS);
}

function isRateLimitError(result: { success: boolean; error?: string }): boolean {
  return !result.success && String(result.error ?? "").includes("429");
}

// ---------------------------------------------------------------------------
// Deduplication — inflight requests are shared across concurrent callers.
// The promise NEVER rejects — errors are caught and returned as ToolResult.
// ---------------------------------------------------------------------------
function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<ToolResult<T>>
): Promise<ToolResult<T>> {
  let pending = inflight.get(key) as Promise<ToolResult<T>> | undefined;
  if (pending) {
    console.log("INFLIGHT JOIN", key);
    return pending;
  }
  console.log("OPENMETEO FETCH", key);
  // Wrap fetcher so the promise NEVER rejects
  pending = fetcher().catch((err): ToolResult<T> => ({
    success: false,
    error: err instanceof Error ? err.message : "Unknown error",
    source: "open-meteo",
  }));
  inflight.set(key, pending);
  pending.finally(() => inflight.delete(key));
  return pending;
}

// ---------------------------------------------------------------------------
// Direct upstream fetch — bypasses cachedFetch to avoid double-caching
// ---------------------------------------------------------------------------
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const MARINE_BASE = "https://marine-api.open-meteo.com/v1";

function weatherCodeToDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 55) return "Drizzle";
  if (code <= 57) return "Freezing drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing rain";
  if (code <= 75) return "Snow";
  if (code <= 77) return "Snow grains";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code <= 99) return "Thunderstorm with hail";
  return "Unknown";
}

async function fetchWeatherDirect(
  lat: number,
  lon: number
): Promise<ToolResult<AllWeatherData>> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: [
        "temperature_2m", "relative_humidity_2m", "apparent_temperature",
        "precipitation", "weather_code", "wind_speed_10m", "wind_direction_10m",
        "surface_pressure", "uv_index", "visibility",
      ].join(","),
      hourly: [
        "temperature_2m", "precipitation_probability", "precipitation",
        "wind_speed_10m", "wind_direction_10m", "weather_code",
      ].join(","),
      daily: [
        "temperature_2m_max", "temperature_2m_min", "precipitation_sum", "weather_code",
      ].join(","),
      forecast_hours: "48",
      forecast_days: "7",
      timezone: "auto",
    });

    const res = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok)
      throw new Error(`Open-Meteo returned ${res.status}: ${res.statusText}`);
    const json = await res.json();

    const c = json.current;
    const current = {
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      pressure: c.surface_pressure,
      uvIndex: c.uv_index,
      visibility: c.visibility,
      weatherCode: c.weather_code,
      description: weatherCodeToDescription(c.weather_code),
      precipitation: c.precipitation,
      timestamp: c.time,
    };

    const h = json.hourly;
    const hourly = h.time.map((time: string, i: number) => ({
      time,
      temperature: h.temperature_2m[i],
      precipitation: h.precipitation[i],
      precipitationProbability: h.precipitation_probability[i],
      windSpeed: h.wind_speed_10m[i],
      windDirection: h.wind_direction_10m[i],
      weatherCode: h.weather_code[i],
    }));

    const d = json.daily;
    const daily = d.time.map((date: string, i: number) => ({
      date,
      tempMax: d.temperature_2m_max[i],
      tempMin: d.temperature_2m_min[i],
      precipitationSum: d.precipitation_sum[i],
      weatherCode: d.weather_code[i],
      description: weatherCodeToDescription(d.weather_code[i]),
    }));

    return { success: true, data: { current, hourly, daily } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "open-meteo",
    };
  }
}

async function fetchMarineDirect(
  lat: number,
  lon: number
): Promise<ToolResult<MarineWeather>> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: [
        "wave_height", "wave_period", "wave_direction",
        "swell_wave_height", "swell_wave_period", "swell_wave_direction",
        "wind_wave_height", "wind_wave_period",
      ].join(","),
    });

    const res = await fetch(`${MARINE_BASE}/marine?${params}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok)
      throw new Error(`Open-Meteo Marine returned ${res.status}: ${res.statusText}`);
    const json = await res.json();
    const c = json.current;

    return {
      success: true,
      data: {
        seaSurfaceTemp: null,
        waveHeight: c.wave_height ?? null,
        wavePeriod: c.wave_period ?? null,
        waveDirection: c.wave_direction ?? null,
        swellHeight: c.swell_wave_height ?? null,
        swellPeriod: c.swell_wave_period ?? null,
        swellDirection: c.swell_wave_direction ?? null,
        windWaveHeight: c.wind_wave_height ?? null,
        windWavePeriod: c.wind_wave_period ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "open-meteo-marine",
    };
  }
}

// ---------------------------------------------------------------------------
// Response helpers — always return HTTP 200
// ---------------------------------------------------------------------------
const HEADERS = { "Cache-Control": "public, s-maxage=300" };

type Served = "fresh" | "stale" | "degraded";

function respond(data: unknown, served: Served) {
  return NextResponse.json(
    { ok: true, success: true, served, data },
    { headers: HEADERS }
  );
}

function respondDegraded(message: string) {
  console.log("SERVING DEGRADED WEATHER");
  return NextResponse.json(
    { ok: false, success: false, served: "degraded", error: message },
    { status: 200, headers: HEADERS }
  );
}

// ---------------------------------------------------------------------------
// Resolve: try fresh result → stale cache → null
// ---------------------------------------------------------------------------
function resolveWeather(
  key: string,
  result: ToolResult<AllWeatherData> | null
): { data: AllWeatherData | null; served: Served } {
  // Successful upstream result
  if (result?.success) {
    setEntry(weatherCache, key, result.data);
    console.log("WEATHER CACHE MISS — fetched fresh", key);
    return { data: result.data, served: "fresh" };
  }

  // Rate-limit detection
  if (result && isRateLimitError(result)) {
    activateBackoff("weather");
  }

  // Try stale cache
  const stale = getStale(weatherCache, key);
  if (stale) {
    console.log("SERVING STALE WEATHER", key);
    return { data: stale, served: "stale" };
  }

  console.log("WEATHER CACHE MISS — no data available", key);
  return { data: null, served: "degraded" };
}

function resolveMarine(
  key: string,
  result: ToolResult<MarineWeather> | null
): { data: MarineWeather | null; served: Served } {
  if (result?.success) {
    setEntry(marineCache, key, result.data);
    return { data: result.data, served: "fresh" };
  }

  if (result && isRateLimitError(result)) {
    activateBackoff("marine");
  }

  const stale = getStale(marineCache, key);
  if (stale) {
    console.log("SERVING STALE WEATHER", key);
    return { data: stale, served: "stale" };
  }

  return { data: null, served: "degraded" };
}

// ---------------------------------------------------------------------------
// GET /api/weather
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tool = searchParams.get("tool");
  if (!tool || !["current", "forecast", "marine", "all"].includes(tool)) {
    return NextResponse.json(
      { ok: false, success: false, error: "Invalid tool. Must be: current, forecast, marine, all", source: "api" },
      { status: 400 }
    );
  }

  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  if (!latStr || !lonStr) {
    return NextResponse.json(
      { ok: false, success: false, error: "lat and lon are required", source: "api" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { ok: false, success: false, error: "lat must be -90..90, lon must be -180..180", source: "api" },
      { status: 400 }
    );
  }

  const type = tool === "forecast" ? searchParams.get("type") : null;
  if (tool === "forecast" && (!type || !["hourly", "daily"].includes(type))) {
    return NextResponse.json(
      { ok: false, success: false, error: "type must be 'hourly' or 'daily' for forecast", source: "api" },
      { status: 400 }
    );
  }

  // =====================================================================
  // tool=all — combined weather + marine in a single response
  // =====================================================================
  if (tool === "all") {
    const wKey = `weather_${lat}_${lon}`;
    const mKey = `marine_${lat}_${lon}`;
    console.log("WEATHER REQUEST all", lat, lon);

    // --- Serve fresh cache immediately ---
    const freshW = getFresh(weatherCache, wKey);
    const freshM = getFresh(marineCache, mKey);
    if (freshW && freshM) {
      console.log("WEATHER CACHE HIT all", lat, lon);
      return respond({ ...freshW, marine: freshM }, "fresh");
    }

    // --- Fetch what we need (skip if backoff active) ---
    let weatherResult: ToolResult<AllWeatherData> | null = null;
    if (freshW) {
      weatherResult = { success: true, data: freshW };
    } else if (isBackoffActive("weather")) {
      console.log("OPENMETEO BACKOFF ACTIVE weather", lat, lon);
      weatherResult = null; // will fall through to stale
    } else {
      weatherResult = await dedupedFetch(wKey, () => fetchWeatherDirect(lat, lon));
    }

    let marineResult: ToolResult<MarineWeather> | null = null;
    if (freshM) {
      marineResult = { success: true, data: freshM };
    } else if (isBackoffActive("marine")) {
      console.log("OPENMETEO BACKOFF ACTIVE marine", lat, lon);
      marineResult = null;
    } else {
      marineResult = await dedupedFetch(mKey, () => fetchMarineDirect(lat, lon));
    }

    const w = resolveWeather(wKey, weatherResult);
    const m = resolveMarine(mKey, marineResult);

    if (!w.data) {
      return respondDegraded("Weather data temporarily unavailable. Please try again shortly.");
    }

    const served = w.served === "fresh" && m.served === "fresh" ? "fresh"
      : w.served === "degraded" || m.served === "degraded" ? "stale"
      : "stale";

    return respond({ ...w.data, marine: m.data }, served);
  }

  // =====================================================================
  // tool=marine
  // =====================================================================
  if (tool === "marine") {
    const mKey = `marine_${lat}_${lon}`;
    console.log("WEATHER REQUEST marine", lat, lon);

    const fresh = getFresh(marineCache, mKey);
    if (fresh) {
      console.log("WEATHER CACHE HIT marine", lat, lon);
      return respond(fresh, "fresh");
    }

    let result: ToolResult<MarineWeather> | null = null;
    if (isBackoffActive("marine")) {
      console.log("OPENMETEO BACKOFF ACTIVE marine", lat, lon);
    } else {
      result = await dedupedFetch(mKey, () => fetchMarineDirect(lat, lon));
    }

    const resolved = resolveMarine(mKey, result);
    if (!resolved.data) return respondDegraded("Marine data temporarily unavailable");
    return respond(resolved.data, resolved.served);
  }

  // =====================================================================
  // tool=current / tool=forecast
  // =====================================================================
  const wKey = `weather_${lat}_${lon}`;
  const toolLabel = tool === "forecast" ? `${type}_${lat}_${lon}` : `${tool}_${lat}_${lon}`;
  console.log("WEATHER REQUEST", toolLabel);

  const fresh = getFresh(weatherCache, wKey);
  if (fresh) {
    console.log("WEATHER CACHE HIT", toolLabel);
    return NextResponse.json(extractSlice(tool, type, fresh), { headers: HEADERS });
  }

  let result: ToolResult<AllWeatherData> | null = null;
  if (isBackoffActive("weather")) {
    console.log("OPENMETEO BACKOFF ACTIVE weather", toolLabel);
  } else {
    result = await dedupedFetch(wKey, () => fetchWeatherDirect(lat, lon));
  }

  const resolved = resolveWeather(wKey, result);
  if (!resolved.data) return respondDegraded("Weather data temporarily unavailable");
  return NextResponse.json(
    { ...extractSlice(tool, type, resolved.data), served: resolved.served },
    { headers: HEADERS }
  );
}

function extractSlice(tool: string, type: string | null, data: AllWeatherData) {
  if (tool === "current") return { success: true, data: data.current };
  if (type === "hourly") return { success: true, data: data.hourly };
  return { success: true, data: data.daily };
}
