import type { ViewportBounds } from "@/lib/types/wind";

/**
 * Normalize viewport bounds to 1 decimal place to prevent
 * micro-precision changes from triggering new API requests.
 * Floors west/south and ceils east/north to ensure full coverage.
 * Clamps to valid coordinate ranges.
 *
 * 1 decimal place (~11 km) is coarse enough that small pan/zoom
 * movements reuse the same cache key, preventing request storms.
 */
export function normalizeBounds(raw: ViewportBounds): ViewportBounds {
  return {
    west: Math.max(-180, Math.floor(raw.west * 10) / 10),
    south: Math.max(-90, Math.floor(raw.south * 10) / 10),
    east: Math.min(180, Math.ceil(raw.east * 10) / 10),
    north: Math.min(90, Math.ceil(raw.north * 10) / 10),
  };
}

/**
 * Server-side alias — same normalization logic, explicit name for clarity.
 * Used in /api/wind route to normalize incoming query params before caching.
 */
export const normalizeBoundsForCache = normalizeBounds;

/**
 * Convert normalized bounds to a stable string key for deduplication.
 */
export function boundsToKey(bounds: ViewportBounds): string {
  return `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
}
