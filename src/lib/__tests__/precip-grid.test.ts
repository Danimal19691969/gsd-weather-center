import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// A. Grid generation — adaptive resolution based on zoom
// ---------------------------------------------------------------------------
describe("generateGridPoints", () => {
  it("returns grid points within viewport bounds", async () => {
    const { generateGridPoints } = await import("@/lib/precip/precipGrid");
    const points = generateGridPoints(
      { west: -123, south: 45, east: -122, north: 46 },
      8
    );
    for (const p of points) {
      expect(p.lat).toBeGreaterThanOrEqual(45);
      expect(p.lat).toBeLessThanOrEqual(46);
      expect(p.lon).toBeGreaterThanOrEqual(-123);
      expect(p.lon).toBeLessThanOrEqual(-122);
    }
  });

  it("produces different coordinates for different cells", async () => {
    const { generateGridPoints } = await import("@/lib/precip/precipGrid");
    const points = generateGridPoints(
      { west: -130, south: 40, east: -120, north: 50 },
      6
    );
    expect(points.length).toBeGreaterThan(1);
    // Not all points should share the same lat or lon
    const lats = new Set(points.map((p) => p.lat));
    const lons = new Set(points.map((p) => p.lon));
    expect(lats.size).toBeGreaterThan(1);
    expect(lons.size).toBeGreaterThan(1);
  });

  it("limits total grid cells to MAX_GRID_CELLS", async () => {
    const { generateGridPoints, MAX_GRID_CELLS } = await import(
      "@/lib/precip/precipGrid"
    );
    // Very wide viewport at high zoom should still be capped
    const points = generateGridPoints(
      { west: -180, south: -90, east: 180, north: 90 },
      10
    );
    expect(points.length).toBeLessThanOrEqual(MAX_GRID_CELLS);
  });

  it("uses coarser resolution at low zoom", async () => {
    const { generateGridPoints } = await import("@/lib/precip/precipGrid");
    const lowZoom = generateGridPoints(
      { west: -130, south: 40, east: -120, north: 50 },
      3
    );
    const highZoom = generateGridPoints(
      { west: -130, south: 40, east: -120, north: 50 },
      8
    );
    // Low zoom should produce fewer or equal cells
    expect(lowZoom.length).toBeLessThanOrEqual(highZoom.length);
  });

  it("uses adaptive resolution: zoom<4→2°, zoom<6→1°, zoom>=6→0.5°", async () => {
    const { getGridResolution } = await import("@/lib/precip/precipGrid");
    expect(getGridResolution(3)).toBe(2);
    expect(getGridResolution(5)).toBe(1);
    expect(getGridResolution(8)).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// B. Grid cell structure
// ---------------------------------------------------------------------------
describe("PrecipGridCell", () => {
  it("grid points have lat and lon fields", async () => {
    const { generateGridPoints } = await import("@/lib/precip/precipGrid");
    const points = generateGridPoints(
      { west: -123, south: 45, east: -122, north: 46 },
      8
    );
    expect(points.length).toBeGreaterThan(0);
    expect(points[0]).toHaveProperty("lat");
    expect(points[0]).toHaveProperty("lon");
  });
});

// ---------------------------------------------------------------------------
// C. Grid key generation for caching
// ---------------------------------------------------------------------------
describe("gridCacheKey", () => {
  it("produces stable key for same inputs", async () => {
    const { gridCacheKey } = await import("@/lib/precip/precipGrid");
    const a = gridCacheKey(45.5, -122.6);
    const b = gridCacheKey(45.5, -122.6);
    expect(a).toBe(b);
  });

  it("produces different keys for different coordinates", async () => {
    const { gridCacheKey } = await import("@/lib/precip/precipGrid");
    const a = gridCacheKey(45.5, -122.6);
    const b = gridCacheKey(46.0, -122.6);
    expect(a).not.toBe(b);
  });

  it("rounds coordinates to 1 decimal for cache stability", async () => {
    const { gridCacheKey } = await import("@/lib/precip/precipGrid");
    const a = gridCacheKey(45.51, -122.62);
    const b = gridCacheKey(45.53, -122.64);
    expect(a).toBe(b); // both round to 45.5, -122.6 → same key
  });
});
