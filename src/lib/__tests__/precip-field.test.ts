import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// A. PrecipField construction from grid cells
// ---------------------------------------------------------------------------
describe("PrecipField", () => {
  it("constructs from grid cells with lat/lon/value", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 45, lon: -123, value: 2.0, color: "#1f78b4" },
      { lat: 45, lon: -122, value: 0.0, color: "transparent" },
      { lat: 46, lon: -123, value: 1.0, color: "#a6cee3" },
      { lat: 46, lon: -122, value: 0.5, color: "#a6cee3" },
    ]);
    expect(field.bounds).toBeTruthy();
  });

  it("computes correct bounds from samples", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 44, lon: -125, value: 1.0, color: "#1f78b4" },
      { lat: 48, lon: -120, value: 0.5, color: "#a6cee3" },
    ]);
    expect(field.bounds.south).toBe(44);
    expect(field.bounds.north).toBe(48);
    expect(field.bounds.west).toBe(-125);
    expect(field.bounds.east).toBe(-120);
  });
});

// ---------------------------------------------------------------------------
// B. Bilinear interpolation
// ---------------------------------------------------------------------------
describe("PrecipField interpolation", () => {
  it("returns exact value at a sample point", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 45, lon: -123, value: 3.0, color: "#1f78b4" },
      { lat: 45, lon: -122, value: 0.0, color: "transparent" },
      { lat: 46, lon: -123, value: 1.0, color: "#a6cee3" },
      { lat: 46, lon: -122, value: 0.0, color: "transparent" },
    ]);
    const result = field.sample(45, -123);
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(3.0, 1);
  });

  it("interpolates between sample points", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 45, lon: -123, value: 4.0, color: "#08306b" },
      { lat: 45, lon: -122, value: 0.0, color: "transparent" },
      { lat: 46, lon: -123, value: 4.0, color: "#08306b" },
      { lat: 46, lon: -122, value: 0.0, color: "transparent" },
    ]);
    // Midpoint between 4.0 and 0.0 should be ~2.0
    const result = field.sample(45.5, -122.5);
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(2.0, 1);
  });

  it("returns null outside the field bounds", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 45, lon: -123, value: 1.0, color: "#a6cee3" },
      { lat: 46, lon: -122, value: 0.5, color: "#a6cee3" },
    ]);
    expect(field.sample(40, -130)).toBeNull();
    expect(field.sample(50, -118)).toBeNull();
  });

  it("produces different values at different positions", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 45, lon: -123, value: 5.0, color: "#08306b" },
      { lat: 45, lon: -122, value: 0.0, color: "transparent" },
      { lat: 46, lon: -123, value: 1.0, color: "#a6cee3" },
      { lat: 46, lon: -122, value: 0.0, color: "transparent" },
    ]);
    // Near the high-value corner vs near the low-value corner
    const a = field.sample(45.1, -122.9); // near 5.0 corner
    const b = field.sample(45.9, -122.1); // near 0.0 corner
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.value).toBeGreaterThan(b!.value);
  });

  it("interpolates color channels between samples", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 45, lon: -123, value: 4.0, color: "#ff0000" },
      { lat: 45, lon: -122, value: 4.0, color: "#0000ff" },
      { lat: 46, lon: -123, value: 4.0, color: "#ff0000" },
      { lat: 46, lon: -122, value: 4.0, color: "#0000ff" },
    ]);
    const mid = field.sample(45.5, -122.5);
    expect(mid).not.toBeNull();
    // Midpoint between red and blue → purple-ish
    // R should be ~128, B should be ~128
    expect(mid!.r).toBeGreaterThan(100);
    expect(mid!.r).toBeLessThan(160);
    expect(mid!.b).toBeGreaterThan(100);
    expect(mid!.b).toBeLessThan(160);
  });
});

// ---------------------------------------------------------------------------
// C. Render buffer generation
// ---------------------------------------------------------------------------
describe("PrecipField renderToBuffer", () => {
  it("produces an ImageData-compatible RGBA buffer", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 45, lon: -123, value: 2.0, color: "#1f78b4" },
      { lat: 45, lon: -122, value: 0.0, color: "transparent" },
      { lat: 46, lon: -123, value: 0.0, color: "transparent" },
      { lat: 46, lon: -122, value: 1.0, color: "#a6cee3" },
    ]);
    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: 45 + (pt[1] / 100),
        lng: -123 + (pt[0] / 100),
      }),
    };
    const buf = field.renderToBuffer(100, 100, projector);
    expect(buf).toBeInstanceOf(Uint8ClampedArray);
    expect(buf.length).toBe(100 * 100 * 4); // RGBA
  });

  it("buffer contains non-zero alpha where precipitation exists", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 0, lon: 0, value: 5.0, color: "#1f78b4" },
      { lat: 0, lon: 1, value: 5.0, color: "#1f78b4" },
      { lat: 1, lon: 0, value: 5.0, color: "#1f78b4" },
      { lat: 1, lon: 1, value: 5.0, color: "#1f78b4" },
    ]);
    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: pt[1] / 10,
        lng: pt[0] / 10,
      }),
    };
    const buf = field.renderToBuffer(10, 10, projector);
    // At least some pixels should have non-zero alpha
    let hasAlpha = false;
    for (let i = 3; i < buf.length; i += 4) {
      if (buf[i] > 0) { hasAlpha = true; break; }
    }
    expect(hasAlpha).toBe(true);
  });

  it("buffer has zero alpha where no precipitation", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");
    const field = new PrecipField([
      { lat: 0, lon: 0, value: 0, color: "transparent" },
      { lat: 0, lon: 1, value: 0, color: "transparent" },
      { lat: 1, lon: 0, value: 0, color: "transparent" },
      { lat: 1, lon: 1, value: 0, color: "transparent" },
    ]);
    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: pt[1] / 10,
        lng: pt[0] / 10,
      }),
    };
    const buf = field.renderToBuffer(10, 10, projector);
    for (let i = 3; i < buf.length; i += 4) {
      expect(buf[i]).toBe(0);
    }
  });
});
