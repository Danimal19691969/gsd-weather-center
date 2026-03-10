import { normalizeBounds, boundsToKey } from "./bounds";
import type { ViewportBounds, WindGrid } from "@/lib/types/wind";
import { WindField } from "./WindField";

const CLIENT_RETRY_DELAY_MS = 3000;
const CLIENT_MAX_RETRIES = 2;

interface WindGridJSON {
  west: number;
  south: number;
  east: number;
  north: number;
  cols: number;
  rows: number;
  dx: number;
  dy: number;
  u: number[];
  v: number[];
  speed: number[];
  timestamp: number;
}

export type WindFieldCallback = (field: WindField) => void;

// ---------------------------------------------------------------------------
// HMR-safe state: globalThis persists across module re-evaluations in dev.
// ---------------------------------------------------------------------------
interface WindFetchState {
  lastViewportKey: string | null;
  inflight: Promise<WindField | null> | null;
  inflightKey: string | null;
}

const STATE_KEY = "__windFetchState";

function getState(): WindFetchState {
  const g = globalThis as Record<string, unknown>;
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = {
      lastViewportKey: null,
      inflight: null,
      inflightKey: null,
    };
  }
  return g[STATE_KEY] as WindFetchState;
}

// ---------------------------------------------------------------------------
// Shared fetch logic with retry
// ---------------------------------------------------------------------------
async function fetchWindFromAPI(bounds: ViewportBounds): Promise<WindField | null> {
  const url = `/api/wind?west=${bounds.west}&south=${bounds.south}&east=${bounds.east}&north=${bounds.north}`;

  for (let attempt = 0; attempt <= CLIENT_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        const data: WindGridJSON = json.data;
        const grid: WindGrid = {
          ...data,
          u: new Float32Array(data.u),
          v: new Float32Array(data.v),
          speed: new Float32Array(data.speed),
        };
        return new WindField(grid);
      }

      // If server says rate limited (backoff active), don't retry — it won't help
      const err = json.error ?? "no data";
      if (typeof err === "string" && err.includes("temporarily unavailable")) {
        console.log(`[wind] server rate limited — stopping retries`);
        return null;
      }

      console.log(`[wind] attempt ${attempt + 1} failed: ${err}`);
    } catch (err) {
      console.log(`[wind] attempt ${attempt + 1} error:`, err);
    }

    if (attempt < CLIENT_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, CLIENT_RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Normalize raw bounds and return the stable viewport key. */
export function viewportKey(rawBounds: ViewportBounds): string {
  return boundsToKey(normalizeBounds(rawBounds));
}

/** Fetch wind data for already-stabilized bounds. Skips if key unchanged. */
export function fetchWind(
  rawBounds: ViewportBounds,
  force = false
): Promise<WindField | null> {
  const state = getState();
  const bounds = normalizeBounds(rawBounds);
  const key = boundsToKey(bounds);

  if (!force && key === state.lastViewportKey) {
    console.log(`[wind] SKIP key=${key} (unchanged)`);
    return Promise.resolve(null);
  }

  if (key === state.inflightKey && state.inflight) {
    console.log(`[wind] JOIN key=${key} (inflight)`);
    return state.inflight;
  }

  console.log(`[wind] FETCH key=${key} prev=${state.lastViewportKey}`);

  state.inflightKey = key;

  state.inflight = (async (): Promise<WindField | null> => {
    try {
      const field = await fetchWindFromAPI(bounds);
      // Only mark key as fetched on success — failed fetches must not
      // poison the key, otherwise retries for the same viewport are blocked.
      if (field) {
        state.lastViewportKey = key;
        console.log(`[wind] WIND FIELD REGENERATED key=${key}`);
      } else {
        console.log(`[wind] fetch returned null, key NOT saved (will retry)`);
      }
      return field;
    } finally {
      state.inflight = null;
      state.inflightKey = null;
    }
  })();

  return state.inflight;
}

// For tests — creates an isolated instance with its own state
export function createWindFetcher() {
  let lastKey: string | null = null;
  let inf: Promise<WindField | null> | null = null;
  let infKey: string | null = null;

  return async function (
    rawBounds: ViewportBounds,
    force = false
  ): Promise<WindField | null> {
    const bounds = normalizeBounds(rawBounds);
    const key = boundsToKey(bounds);

    if (!force && key === lastKey) {
      console.log("WIND VIEWPORT UNCHANGED — SKIP FETCH", key);
      return null;
    }

    if (key === infKey && inf) {
      console.log("WIND INFLIGHT JOIN (client)", key);
      return inf;
    }

    infKey = key;

    console.log("WIND FETCH START", key);

    inf = (async (): Promise<WindField | null> => {
      try {
        const field = await fetchWindFromAPI(bounds);
        // Only mark key as fetched on success — failed fetches must not
        // poison the key, otherwise retries for the same viewport are blocked.
        if (field) {
          lastKey = key;
          console.log("WIND FIELD REGENERATED", key);
        } else {
          console.log("WIND fetch returned null, key NOT saved (will retry)");
        }
        return field;
      } finally {
        inf = null;
        infKey = null;
      }
    })();

    return inf;
  };
}
