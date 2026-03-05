import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentWeather,
  getForecast,
  getMarineWeather,
} from "@/lib/tools/weather";

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  data: unknown;
  expiry: number;
}

const routeCache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = routeCache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data;
  if (entry) routeCache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  routeCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tool = searchParams.get("tool");
  if (!tool || !["current", "forecast", "marine"].includes(tool)) {
    return NextResponse.json(
      { success: false, error: "Invalid tool. Must be: current, forecast, marine", source: "api" },
      { status: 400 }
    );
  }

  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  if (!latStr || !lonStr) {
    return NextResponse.json(
      { success: false, error: "lat and lon are required", source: "api" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { success: false, error: "lat must be -90..90, lon must be -180..180", source: "api" },
      { status: 400 }
    );
  }

  const type = tool === "forecast" ? searchParams.get("type") : null;

  if (tool === "forecast" && (!type || !["hourly", "daily"].includes(type))) {
    return NextResponse.json(
      { success: false, error: "type must be 'hourly' or 'daily' for forecast", source: "api" },
      { status: 400 }
    );
  }

  const cacheKey = tool === "forecast"
    ? `${type}_${lat}_${lon}`
    : `${tool}_${lat}_${lon}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  }

  let result;

  if (tool === "current") {
    result = await getCurrentWeather(lat, lon);
  } else if (tool === "forecast") {
    result = await getForecast(lat, lon, type as "hourly" | "daily");
  } else {
    result = await getMarineWeather(lat, lon);
  }

  setCache(cacheKey, result);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
