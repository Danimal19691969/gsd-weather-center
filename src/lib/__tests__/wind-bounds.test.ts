import { describe, it, expect } from "vitest";
import { normalizeBounds, boundsToKey } from "@/lib/wind/bounds";
import type { ViewportBounds } from "@/lib/types/wind";

describe("normalizeBounds", () => {
  it("rounds coordinates to 2 decimal places", () => {
    const raw: ViewportBounds = {
      west: -137.23385085897024,
      south: 43.87902154893021,
      east: -108.12293847561234,
      north: 47.10510293847561,
    };
    const result = normalizeBounds(raw);
    expect(result.west).toBe(-137.24);
    expect(result.south).toBe(43.87);
    expect(result.east).toBe(-108.12);
    expect(result.north).toBe(47.11);
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
    // west/south should floor, east/north should ceil to ensure coverage
    expect(result.west).toBe(-137.24);
    expect(result.south).toBe(43.87);
    expect(result.east).toBe(-108.12);
    expect(result.north).toBe(47.11);
  });
});

describe("boundsToKey", () => {
  it("produces a stable string key for the same normalized bounds", () => {
    const bounds: ViewportBounds = { west: -137.24, south: 43.87, east: -108.12, north: 47.11 };
    const key1 = boundsToKey(bounds);
    const key2 = boundsToKey(bounds);
    expect(key1).toBe(key2);
  });

  it("encodes all four coordinates in the key", () => {
    const bounds: ViewportBounds = { west: -137.24, south: 43.87, east: -108.12, north: 47.11 };
    const key = boundsToKey(bounds);
    expect(key).toContain("-137.24");
    expect(key).toContain("43.87");
    expect(key).toContain("-108.12");
    expect(key).toContain("47.11");
  });

  it("produces different keys for different bounds", () => {
    const a = boundsToKey({ west: -137.24, south: 43.87, east: -108.12, north: 47.11 });
    const b = boundsToKey({ west: -130.00, south: 40.00, east: -100.00, north: 50.00 });
    expect(a).not.toBe(b);
  });
});
