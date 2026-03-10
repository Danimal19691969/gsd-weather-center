import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { normalizeBounds, boundsToKey } from "@/lib/wind/bounds";

// ---------------------------------------------------------------------------
// A. Bounds normalization
// ---------------------------------------------------------------------------
describe("Wind fetch deduplication — bounds normalization", () => {
  it("normalizing raw bounds produces stable keys across micro-movements", () => {
    const bases = Array.from({ length: 10 }, (_, i) => ({
      west: -137.2338 + i * 0.00001,
      south: 43.8790 + i * 0.00001,
      east: -108.1229 + i * 0.00001,
      north: 47.1051 + i * 0.00001,
    }));
    const keys = bases.map((b) => boundsToKey(normalizeBounds(b)));
    expect(new Set(keys).size).toBe(1);
  });

  it("produces a new key when viewport changes significantly", () => {
    const before = normalizeBounds({ west: -137.23, south: 43.87, east: -108.12, north: 47.10 });
    const after = normalizeBounds({ west: -136.23, south: 43.87, east: -107.12, north: 47.10 });
    expect(boundsToKey(before)).not.toBe(boundsToKey(after));
  });

  it("does not produce new key for sub-pixel precision differences", () => {
    const a = normalizeBounds({
      west: -137.2338508589, south: 43.8790215489,
      east: -108.1229384756, north: 47.1051029384,
    });
    const b = normalizeBounds({
      west: -137.2331234567, south: 43.8795678901,
      east: -108.1224567890, north: 47.1055678901,
    });
    expect(boundsToKey(a)).toBe(boundsToKey(b));
  });
});

// ---------------------------------------------------------------------------
// D. Animation/data separation
// ---------------------------------------------------------------------------
describe("WindParticleSystem animation loop isolation", () => {
  it("tick method source does not contain fetch calls", async () => {
    const { WindParticleSystem } = await import("@/lib/wind/WindParticleSystem");
    const proto = WindParticleSystem.prototype;
    for (const name of Object.getOwnPropertyNames(proto)) {
      const method = proto[name as keyof typeof proto];
      if (typeof method === "function") {
        const source = method.toString();
        expect(source).not.toContain("/api/wind");
        expect(source).not.toContain("fetch(");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// B + C. createWindFetcher — viewport key guard + inflight dedup
// ---------------------------------------------------------------------------
describe("createWindFetcher", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchCallCount: number;
  let fetchedUrls: string[];

  function mockFetch() {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      fetchCallCount++;
      fetchedUrls.push(String(input));
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({
        success: true,
        data: {
          west: -137.3, south: 43.8, east: -108.1, north: 47.2,
          cols: 12, rows: 12, dx: 1, dy: 1,
          u: new Array(144).fill(0),
          v: new Array(144).fill(0),
          speed: new Array(144).fill(0),
          timestamp: Date.now(),
        },
      }));
    }) as typeof globalThis.fetch;
  }

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchCallCount = 0;
    fetchedUrls = [];
    mockFetch();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("concurrent calls with same bounds trigger only one fetch", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();
    const bounds = { west: -137.3, south: 43.8, east: -108.1, north: 47.2 };

    const promises = Array.from({ length: 10 }, () => fetcher(bounds));
    await Promise.all(promises);
    expect(fetchCallCount).toBe(1);
  });

  it("calls with different bounds each trigger one fetch", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();

    await fetcher({ west: -137.3, south: 43.8, east: -108.1, north: 47.2 });
    await fetcher({ west: -130.0, south: 40.0, east: -100.0, north: 50.0 });
    expect(fetchCallCount).toBe(2);
  });

  it("same bounds repeated does not re-fetch (viewport key guard)", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();
    const bounds = { west: -137.3, south: 43.8, east: -108.1, north: 47.2 };

    await fetcher(bounds);
    await fetcher(bounds);
    await fetcher(bounds);
    expect(fetchCallCount).toBe(1);
  });

  it("force=true bypasses key dedup for periodic refresh", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();
    const bounds = { west: -137.3, south: 43.8, east: -108.1, north: 47.2 };

    await fetcher(bounds);
    await fetcher(bounds, true);
    expect(fetchCallCount).toBe(2);
  });

  it("always sends normalized bounds in URLs, never raw floats", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();

    await fetcher({
      west: -137.23385085897024,
      south: 43.87901144153838,
      east: -108.1229491410306,
      north: 47.105163247425224,
    });

    expect(fetchCallCount).toBe(1);
    const url = fetchedUrls[0];
    expect(url).toContain("west=-137.3");
    expect(url).toContain("south=43.8");
    expect(url).toContain("east=-108.1");
    expect(url).toContain("north=47.2");
    expect(url).not.toContain("-137.2338508");
    expect(url).not.toContain("43.879011");
  });

  it("100 rapid calls with the same raw bounds only fetch once", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();

    const promises = Array.from({ length: 100 }, (_, i) => {
      return fetcher({
        west: -137.2338 + i * 0.00001,
        south: 43.8790 + i * 0.00001,
        east: -108.1229 + i * 0.00001,
        north: 47.1051 + i * 0.00001,
      });
    });
    await Promise.all(promises);
    expect(fetchCallCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// F. Viewport stabilization
// ---------------------------------------------------------------------------
describe("Viewport stabilization", () => {
  it("viewportKey returns the same key for micro-different bounds", async () => {
    const { viewportKey } = await import("@/lib/wind/windFetcher");
    const a = viewportKey({ west: -137.2338, south: 43.879, east: -108.1229, north: 47.1051 });
    const b = viewportKey({ west: -137.2331, south: 43.8795, east: -108.1224, north: 47.1055 });
    expect(a).toBe(b);
  });

  it("viewportKey returns different keys for meaningfully different bounds", async () => {
    const { viewportKey } = await import("@/lib/wind/windFetcher");
    const narrow = viewportKey({ west: -125.19, south: 45.23, east: -120.17, north: 45.8 });
    const wide = viewportKey({ west: -137.3, south: 43.8, east: -108.1, north: 47.2 });
    expect(narrow).not.toBe(wide);
  });

  it("oscillating A→B→A settles to one fetch for the final position", async () => {
    vi.useFakeTimers();
    const STABILIZATION_MS = 400;

    let fetchCount = 0;
    const calls: string[] = [];

    // Simulate the stabilization guard from the component
    let lastChangeTime = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastKey: string | null = null;

    const { viewportKey } = await import("@/lib/wind/windFetcher");

    function maybeFetch(bounds: { west: number; south: number; east: number; north: number }) {
      const key = viewportKey(bounds);
      lastChangeTime = Date.now();
      if (timer) clearTimeout(timer);
      const captured = lastChangeTime;
      timer = setTimeout(() => {
        if (lastChangeTime !== captured) return;
        if (key === lastKey) return;
        lastKey = key;
        fetchCount++;
        calls.push(key);
      }, STABILIZATION_MS);
    }

    const boundsA = { west: -137.3, south: 43.8, east: -108.1, north: 47.2 };
    const boundsB = { west: -125.19, south: 45.23, east: -120.17, north: 45.8 };

    // Oscillate A→B→A within stabilization window
    maybeFetch(boundsA); // t=0
    vi.advanceTimersByTime(100);
    maybeFetch(boundsB); // t=100
    vi.advanceTimersByTime(100);
    maybeFetch(boundsA); // t=200 — settles here

    // Advance past stabilization
    vi.advanceTimersByTime(STABILIZATION_MS + 50);

    expect(fetchCount).toBe(1);
    expect(calls[0]).toBe(viewportKey(boundsA));

    vi.useRealTimers();
  });

  it("rapid viewport changes during drag produce zero fetches until stable", async () => {
    vi.useFakeTimers();
    const STABILIZATION_MS = 400;

    let fetchCount = 0;
    let lastChangeTime = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastKey: string | null = null;

    const { viewportKey } = await import("@/lib/wind/windFetcher");

    function maybeFetch(bounds: { west: number; south: number; east: number; north: number }) {
      const key = viewportKey(bounds);
      lastChangeTime = Date.now();
      if (timer) clearTimeout(timer);
      const captured = lastChangeTime;
      timer = setTimeout(() => {
        if (lastChangeTime !== captured) return;
        if (key === lastKey) return;
        lastKey = key;
        fetchCount++;
      }, STABILIZATION_MS);
    }

    // 20 rapid viewport changes, 50ms apart (simulating drag)
    for (let i = 0; i < 20; i++) {
      maybeFetch({
        west: -137 + i * 0.5,
        south: 43 + i * 0.1,
        east: -108 + i * 0.5,
        north: 47 + i * 0.1,
      });
      vi.advanceTimersByTime(50);
    }

    // During drag: zero fetches
    expect(fetchCount).toBe(0);

    // After stabilization
    vi.advanceTimersByTime(STABILIZATION_MS + 50);
    expect(fetchCount).toBe(1);

    vi.useRealTimers();
  });

  it("stable viewport triggers exactly one fetch", async () => {
    vi.useFakeTimers();
    const STABILIZATION_MS = 400;

    let fetchCount = 0;
    let lastChangeTime = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastKey: string | null = null;

    const { viewportKey } = await import("@/lib/wind/windFetcher");

    function maybeFetch(bounds: { west: number; south: number; east: number; north: number }) {
      const key = viewportKey(bounds);
      lastChangeTime = Date.now();
      if (timer) clearTimeout(timer);
      const captured = lastChangeTime;
      timer = setTimeout(() => {
        if (lastChangeTime !== captured) return;
        if (key === lastKey) return;
        lastKey = key;
        fetchCount++;
      }, STABILIZATION_MS);
    }

    const bounds = { west: -137.3, south: 43.8, east: -108.1, north: 47.2 };

    maybeFetch(bounds);
    vi.advanceTimersByTime(STABILIZATION_MS + 50);
    expect(fetchCount).toBe(1);

    // Calling again with same bounds — no new fetch
    maybeFetch(bounds);
    vi.advanceTimersByTime(STABILIZATION_MS + 50);
    expect(fetchCount).toBe(1);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// E. Server cache protection
// ---------------------------------------------------------------------------
describe("/api/wind server cache", () => {
  it("normalizes bounds in cache key so raw floats hit the same entry", async () => {
    const { normalizeBoundsForCache } = await import("@/lib/wind/bounds");

    const raw = { west: -137.23385, south: 43.87901, east: -108.12294, north: 47.10516 };
    const normalized = normalizeBoundsForCache(raw);

    expect(normalized.west).toBe(-137.3);
    expect(normalized.south).toBe(43.8);
    expect(normalized.east).toBe(-108.1);
    expect(normalized.north).toBe(47.2);
  });
});
