import type { ViewportBounds } from "@/lib/types/wind";

/**
 * Normalize viewport bounds to 2 decimal places to prevent
 * micro-precision changes from triggering new API requests.
 * Floors west/south and ceils east/north to ensure full coverage.
 * Clamps to valid coordinate ranges.
 */
export function normalizeBounds(raw: ViewportBounds): ViewportBounds {
  return {
    west: Math.max(-180, Math.floor(raw.west * 100) / 100),
    south: Math.max(-90, Math.floor(raw.south * 100) / 100),
    east: Math.min(180, Math.ceil(raw.east * 100) / 100),
    north: Math.min(90, Math.ceil(raw.north * 100) / 100),
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
