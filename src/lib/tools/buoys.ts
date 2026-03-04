import type { ToolResult } from "@/lib/types/tool-result";
import type { BuoyStation, BuoyObservation } from "@/lib/types/buoy";
import { haversineDistance } from "@/lib/utils/distance";
import { buoyStations } from "@/data/stations";

const NDBC_BASE = "https://www.ndbc.noaa.gov/data/realtime2";

const SENTINEL_VALUES = new Set(["MM", "99.0", "999.0", "9999.0", "99.00", "999.00", "9999.00"]);

function parseNumOrNull(value: string): number | null {
  if (SENTINEL_VALUES.has(value)) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

export function parseNDBCText(text: string, stationId: string): BuoyObservation[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const observations: BuoyObservation[] = [];

  for (const line of lines) {
    if (line.startsWith("#")) continue;

    const parts = line.trim().split(/\s+/);
    if (parts.length < 13) continue;

    const [yy, mm, dd, hh, mn] = parts;
    const year = parseInt(yy, 10);
    const month = parseInt(mm, 10) - 1;
    const day = parseInt(dd, 10);
    const hour = parseInt(hh, 10);
    const minute = parseInt(mn, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) continue;

    const timestamp = new Date(Date.UTC(year, month, day, hour, minute)).toISOString();

    observations.push({
      stationId,
      timestamp,
      windDirection: parseNumOrNull(parts[5]),
      windSpeed: parseNumOrNull(parts[6]),
      gustSpeed: parseNumOrNull(parts[7]),
      waveHeight: parseNumOrNull(parts[8]),
      wavePeriod: parseNumOrNull(parts[9]),
      avgWavePeriod: parseNumOrNull(parts[10]),
      meanWaveDirection: parseNumOrNull(parts[11]),
      pressure: parseNumOrNull(parts[12]),
      airTemp: parts[13] ? parseNumOrNull(parts[13]) : null,
      waterTemp: parts[14] ? parseNumOrNull(parts[14]) : null,
      dewpoint: parts[15] ? parseNumOrNull(parts[15]) : null,
      visibility: parts[16] ? parseNumOrNull(parts[16]) : null,
    });
  }

  return observations;
}

export async function getNearbyBuoys(
  lat: number,
  lon: number,
  radiusMiles: number = 100,
  limit: number = 10
): Promise<ToolResult<(BuoyStation & { distanceMiles: number })[]>> {
  try {
    const withDistance = buoyStations
      .map((station) => ({
        ...station,
        distanceMiles: Math.round(haversineDistance(lat, lon, station.lat, station.lon) * 10) / 10,
      }))
      .filter((s) => s.distanceMiles <= radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, limit);

    return { success: true, data: withDistance };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "buoy-search",
    };
  }
}

export async function getBuoyObservations(
  stationId: string
): Promise<ToolResult<BuoyObservation>> {
  try {
    const res = await fetch(`${NDBC_BASE}/${stationId}.txt`);
    if (!res.ok) {
      return {
        success: false,
        error: `NDBC returned ${res.status} for station ${stationId}`,
        source: "ndbc",
      };
    }

    const text = await res.text();
    const observations = parseNDBCText(text, stationId);

    if (observations.length === 0) {
      return {
        success: false,
        error: `No observations found for station ${stationId}`,
        source: "ndbc",
      };
    }

    return { success: true, data: observations[0] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "ndbc",
    };
  }
}

export async function getBuoyHistory(
  stationId: string
): Promise<ToolResult<BuoyObservation[]>> {
  try {
    const res = await fetch(`${NDBC_BASE}/${stationId}.txt`);
    if (!res.ok) {
      return {
        success: false,
        error: `NDBC returned ${res.status} for station ${stationId}`,
        source: "ndbc",
      };
    }

    const text = await res.text();
    const observations = parseNDBCText(text, stationId);

    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = observations.filter(
      (obs) => new Date(obs.timestamp).getTime() >= twentyFourHoursAgo
    );

    return { success: true, data: recent };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      source: "ndbc",
    };
  }
}
