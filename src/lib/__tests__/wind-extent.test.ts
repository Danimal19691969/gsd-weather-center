import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// A. Field regeneration on viewport change
// ---------------------------------------------------------------------------
describe("Wind field regeneration on viewport change", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchCallCount: number;

  function mockFetchWithBounds() {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      fetchCallCount++;
      const url = new URL(String(input), "http://localhost");
      const west = parseFloat(url.searchParams.get("west") ?? "0");
      const south = parseFloat(url.searchParams.get("south") ?? "0");
      const east = parseFloat(url.searchParams.get("east") ?? "0");
      const north = parseFloat(url.searchParams.get("north") ?? "0");
      const cols = 12;
      const rows = 12;
      const dx = (east - west) / (cols - 1);
      const dy = (north - south) / (rows - 1);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            west,
            south,
            east,
            north,
            cols,
            rows,
            dx,
            dy,
            u: new Array(cols * rows).fill(5),
            v: new Array(cols * rows).fill(3),
            speed: new Array(cols * rows).fill(5.8),
            timestamp: Date.now(),
          },
        })
      );
    }) as typeof globalThis.fetch;
  }

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchCallCount = 0;
    mockFetchWithBounds();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches new field when viewport changes significantly", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();

    const initial = { west: -125, south: 44, east: -120, north: 48 };
    const zoomedOut = { west: -140, south: 35, east: -105, north: 55 };

    const field1 = await fetcher(initial);
    const field2 = await fetcher(zoomedOut);

    expect(fetchCallCount).toBe(2);
    expect(field1).not.toBeNull();
    expect(field2).not.toBeNull();
  });

  it("returned field has bounds matching the zoomed-out viewport", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");
    const fetcher = createWindFetcher();

    const zoomedOut = { west: -140, south: 35, east: -105, north: 55 };
    const field = await fetcher(zoomedOut);

    expect(field).not.toBeNull();
    // Bounds should be at least as large as the requested viewport (after normalization)
    expect(field!.bounds.west).toBeLessThanOrEqual(-140);
    expect(field!.bounds.south).toBeLessThanOrEqual(35);
    expect(field!.bounds.east).toBeGreaterThanOrEqual(-105);
    expect(field!.bounds.north).toBeGreaterThanOrEqual(55);
  });

  it("renderer uses updated field after setField", async () => {
    const { WindParticleSystem } = await import(
      "@/lib/wind/WindParticleSystem"
    );
    const { WindField } = await import("@/lib/wind/WindField");

    // Create a mock canvas
    const canvas = {
      width: 800,
      height: 600,
      getContext: () => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        globalCompositeOperation: "source-over",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
      }),
    } as unknown as HTMLCanvasElement;

    const system = new WindParticleSystem(canvas);

    const smallField = new WindField({
      west: -125,
      south: 44,
      east: -120,
      north: 48,
      cols: 12,
      rows: 12,
      dx: 5 / 11,
      dy: 4 / 11,
      u: new Float32Array(144).fill(5),
      v: new Float32Array(144).fill(3),
      speed: new Float32Array(144).fill(5.8),
      timestamp: Date.now(),
    });

    const largeField = new WindField({
      west: -140,
      south: 35,
      east: -105,
      north: 55,
      cols: 12,
      rows: 12,
      dx: 35 / 11,
      dy: 20 / 11,
      u: new Float32Array(144).fill(5),
      v: new Float32Array(144).fill(3),
      speed: new Float32Array(144).fill(5.8),
      timestamp: Date.now(),
    });

    system.setField(smallField);
    system.setField(largeField);

    // After setting the larger field, interpolation should work for
    // coordinates within the larger bounds
    const result = largeField.interpolate(40, -130);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(5);
  });

  it("failed fetch does not poison viewport key for future fetches", async () => {
    const { createWindFetcher } = await import("@/lib/wind/windFetcher");

    let shouldFail = true;
    globalThis.fetch = vi.fn(async () => {
      fetchCallCount++;
      if (shouldFail) {
        return new Response(
          JSON.stringify({ success: false, error: "server error" })
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            west: -140,
            south: 35,
            east: -105,
            north: 55,
            cols: 12,
            rows: 12,
            dx: 35 / 11,
            dy: 20 / 11,
            u: new Array(144).fill(5),
            v: new Array(144).fill(3),
            speed: new Array(144).fill(5.8),
            timestamp: Date.now(),
          },
        })
      );
    }) as typeof globalThis.fetch;

    const fetcher = createWindFetcher();
    const bounds = { west: -140, south: 35, east: -105, north: 55 };

    // First attempt fails
    const result1 = await fetcher(bounds);
    expect(result1).toBeNull();

    // Second attempt with same bounds should retry (not skip)
    shouldFail = false;
    const result2 = await fetcher(bounds);
    expect(result2).not.toBeNull();
    // First attempt: 3 tries (all fail). Second attempt: 1 try (succeeds).
    expect(fetchCallCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// B. Wind covers larger viewport after zoom out
// ---------------------------------------------------------------------------
describe("Wind field covers viewport after zoom", () => {
  it("interpolation succeeds across the full field bounds", async () => {
    const { WindField } = await import("@/lib/wind/WindField");

    const field = new WindField({
      west: -140,
      south: 35,
      east: -105,
      north: 55,
      cols: 12,
      rows: 12,
      dx: 35 / 11,
      dy: 20 / 11,
      u: new Float32Array(144).fill(5),
      v: new Float32Array(144).fill(3),
      speed: new Float32Array(144).fill(5.8),
      timestamp: Date.now(),
    });

    // Test multiple points within the larger bounds
    const testPoints = [
      { lat: 36, lon: -139 },
      { lat: 45, lon: -122 },
      { lat: 54, lon: -106 },
      { lat: 40, lon: -130 },
    ];

    for (const p of testPoints) {
      const result = field.interpolate(p.lat, p.lon);
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(5);
      expect(result![1]).toBeCloseTo(3);
    }
  });

  it("interpolation returns null ONLY outside field bounds", async () => {
    const { WindField } = await import("@/lib/wind/WindField");

    const field = new WindField({
      west: -140,
      south: 35,
      east: -105,
      north: 55,
      cols: 12,
      rows: 12,
      dx: 35 / 11,
      dy: 20 / 11,
      u: new Float32Array(144).fill(5),
      v: new Float32Array(144).fill(3),
      speed: new Float32Array(144).fill(5.8),
      timestamp: Date.now(),
    });

    // These should return null (outside bounds)
    expect(field.interpolate(34, -130)).toBeNull();
    expect(field.interpolate(56, -130)).toBeNull();
    expect(field.interpolate(45, -141)).toBeNull();
    expect(field.interpolate(45, -104)).toBeNull();
  });
});
