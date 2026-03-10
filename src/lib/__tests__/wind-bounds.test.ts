import { describe, it, expect } from "vitest";
import { normalizeBounds, boundsToKey } from "@/lib/wind/bounds";
import type { ViewportBounds } from "@/lib/types/wind";

describe("normalizeBounds", () => {
  it("rounds coordinates to 1 decimal place", () => {
    const raw: ViewportBounds = {
      west: -137.23385085897024,
      south: 43.87902154893021,
      east: -108.12293847561234,
      north: 47.10510293847561,
    };
    const result = normalizeBounds(raw);
    // west/south floor, east/north ceil at 1 decimal
    expect(result.west).toBe(-137.3);
    expect(result.south).toBe(43.8);
    expect(result.east).toBe(-108.1);
    expect(result.north).toBe(47.2);
  });

  it("produces identical output for micro-different inputs", () => {
    const a = normalizeBounds({
      west: -137.23385085897024,
      south: 43.87902154893021,
      east: -108.12293847561234,
      north: 47.10510293847561,
    });
    const b = normalizeBounds({
      west: -137.23199999999999,
      south: 43.87800000000001,
      east: -108.12100000000001,
      north: 47.10999999999999,
    });
    expect(a.west).toBe(b.west);
    expect(a.south).toBe(b.south);
    expect(a.east).toBe(b.east);
    expect(a.north).toBe(b.north);
  });

  it("clamps to valid coordinate ranges", () => {
    const result = normalizeBounds({
      west: -200,
      south: -100,
      east: 200,
      north: 100,
    });
    expect(result.west).toBe(-180);
    expect(result.south).toBe(-90);
    expect(result.east).toBe(180);
    expect(result.north).toBe(90);
  });

  it("floors west/south and ceils east/north for grid coverage", () => {
    const result = normalizeBounds({
      west: -137.235,
      south: 43.874,
      east: -108.121,
      north: 47.106,
    });
    // west/south floor at 1dp, east/north ceil at 1dp
    expect(result.west).toBe(-137.3);
    expect(result.south).toBe(43.8);
    expect(result.east).toBe(-108.1);
    expect(result.north).toBe(47.2);
  });

  it("bounds differing at 2nd decimal produce same key (prevents request storm)", () => {
    // These bounds differ only at hundredths within the same 0.1 bucket —
    // the old 2dp normalization would produce different keys, causing a request storm.
    const a = normalizeBounds({
      west: -126.83, south: 45.21, east: -122.04, north: 46.81,
    });
    const b = normalizeBounds({
      west: -126.85, south: 45.25, east: -122.08, north: 46.85,
    });
    expect(boundsToKey(a)).toBe(boundsToKey(b));
  });
});

describe("boundsToKey", () => {
  it("produces a stable string key for the same normalized bounds", () => {
    const bounds: ViewportBounds = { west: -137.3, south: 43.8, east: -108.1, north: 47.2 };
    const key1 = boundsToKey(bounds);
    const key2 = boundsToKey(bounds);
    expect(key1).toBe(key2);
  });

  it("encodes all four coordinates in the key", () => {
    const bounds: ViewportBounds = { west: -137.3, south: 43.8, east: -108.1, north: 47.2 };
    const key = boundsToKey(bounds);
    expect(key).toContain("-137.3");
    expect(key).toContain("43.8");
    expect(key).toContain("-108.1");
    expect(key).toContain("47.2");
  });

  it("produces different keys for different bounds", () => {
    const a = boundsToKey({ west: -137.3, south: 43.8, east: -108.1, north: 47.2 });
    const b = boundsToKey({ west: -130.0, south: 40.0, east: -100.0, north: 50.0 });
    expect(a).not.toBe(b);
  });
});
