import { NextRequest, NextResponse } from "next/server";
import { fetchWindGrid } from "@/lib/tools/wind";
import { normalizeBoundsForCache, boundsToKey } from "@/lib/wind/bounds";
import { isBackoffActive } from "@/lib/fetchWithRetry";

// ---------------------------------------------------------------------------
// HMR-safe cache — globalThis survives module re-evaluation in dev mode.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

interface CacheEntry {
  data: unknown;
  expiry: number;
}

interface WindCacheState {
  cache: Map<string, CacheEntry>;
  inflight: Map<string, Promise<unknown>>;
}

const CACHE_KEY = "__windCacheState";
function getCacheState(): WindCacheState {
  const g = globalThis as Record<string, unknown>;
  if (!g[CACHE_KEY]) {
    g[CACHE_KEY] = {
      cache: new Map<string, CacheEntry>(),
      inflight: new Map<string, Promise<unknown>>(),
    };
  }
  return g[CACHE_KEY] as WindCacheState;
}

function getCached(key: string): CacheEntry | null {
  const { cache } = getCacheState();
  return cache.get(key) ?? null;
}

function getCachedFresh(key: string): unknown | null {
  const entry = getCached(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) return null;
  return entry.data;
}

function setCached(key: string, data: unknown): void {
  const { cache } = getCacheState();
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// GET /api/wind
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const west = parseFloat(searchParams.get("west") ?? "");
    const south = parseFloat(searchParams.get("south") ?? "");
    const east = parseFloat(searchParams.get("east") ?? "");
    const north = parseFloat(searchParams.get("north") ?? "");

    if ([west, south, east, north].some(isNaN)) {
      return NextResponse.json(
        { success: false, error: "west, south, east, north are required" },
        { status: 400 }
      );
    }

    const normalized = normalizeBoundsForCache({ west, south, east, north });
    const cacheKey = boundsToKey(normalized);

    // Serve from fresh cache
    const freshCached = getCachedFresh(cacheKey);
    if (freshCached) {
      console.log("WIND CACHE HIT", cacheKey);
      return NextResponse.json(
        { success: true, data: freshCached },
        { headers: { "Cache-Control": "public, s-maxage=300" } }
      );
    }

    // If global backoff is active, serve stale immediately instead of hitting upstream
    if (isBackoffActive()) {
      const staleEntry = getCached(cacheKey);
      if (staleEntry) {
        console.log("WIND SERVING STALE CACHE (backoff active)", cacheKey);
        return NextResponse.json(
          { success: true, data: staleEntry.data },
          { headers: { "Cache-Control": "public, s-maxage=60" } }
        );
      }
      console.log("WIND BACKOFF ACTIVE — no stale cache available", cacheKey);
      return NextResponse.json(
        { success: false, error: "Wind service temporarily unavailable (rate limited)" },
        { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } }
      );
    }

    // Deduplicate concurrent requests for same bounds
    const { inflight } = getCacheState();
    let pending = inflight.get(cacheKey);
    if (pending) {
      console.log("WIND INFLIGHT JOIN", cacheKey);
    } else {
      console.log("WIND CACHE MISS — fetching", cacheKey);
      const raw = fetchWindGrid(normalized)
        .then((grid) => ({
          ...grid,
          u: Array.from(grid.u),
          v: Array.from(grid.v),
          speed: Array.from(grid.speed),
        }));
      // Wrap in a chain that always cleans up inflight and never leaves unhandled rejections
      pending = raw.finally(() => inflight.delete(cacheKey));
      inflight.set(cacheKey, pending);
    }

    const data = await pending;
    setCached(cacheKey, data);

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, s-maxage=300" } }
    );
  } catch (error) {
    // Quiet log for expected backoff errors, full log for unexpected errors
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.includes("backoff")) {
      console.log("WIND BACKOFF — serving fallback");
    } else {
      console.error("WIND API ERROR:", error);
    }

    // Serve stale cache if available
    const { searchParams } = request.nextUrl;
    const normalized = normalizeBoundsForCache({
      west: parseFloat(searchParams.get("west") ?? "0"),
      south: parseFloat(searchParams.get("south") ?? "0"),
      east: parseFloat(searchParams.get("east") ?? "0"),
      north: parseFloat(searchParams.get("north") ?? "0"),
    });
    const staleKey = boundsToKey(normalized);
    const staleEntry = getCached(staleKey);
    if (staleEntry) {
      console.log("WIND SERVING STALE CACHE", staleKey);
      return NextResponse.json(
        { success: true, data: staleEntry.data },
        { headers: { "Cache-Control": "public, s-maxage=60" } }
      );
    }

    return NextResponse.json(
      { success: false, error: "Wind service temporarily unavailable" },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }
}
