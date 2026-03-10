import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// A. Precipitation renders smooth output (no blocky artifacts)
// ---------------------------------------------------------------------------
describe("PrecipField renderToBuffer produces smooth gradients", () => {
  it("adjacent pixels have smoothly varying alpha (no sharp 4px block edges)", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    // Create a field with a gradient from high precip to zero
    const field = new PrecipField([
      { lat: 0, lon: 0, value: 5.0, color: "#1f78b4" },
      { lat: 0, lon: 1, value: 0.0, color: "transparent" },
      { lat: 1, lon: 0, value: 5.0, color: "#1f78b4" },
      { lat: 1, lon: 1, value: 0.0, color: "transparent" },
    ]);

    // Projector maps pixel coords to lat/lon within the field
    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: pt[1] / 20, // 0..20 pixels -> 0..1 lat
        lng: pt[0] / 20, // 0..20 pixels -> 0..1 lon
      }),
    };

    const buf = field.renderToBuffer(20, 20, projector);

    // Check that alpha values change smoothly pixel-by-pixel along a row.
    // In the old block renderer, alpha would be constant for 4px then jump.
    // With smooth interpolation, adjacent pixels should differ by at most a
    // small amount (no sudden jumps except at the field boundary).
    const row = 10; // middle row
    const alphas: number[] = [];
    for (let x = 0; x < 20; x++) {
      alphas.push(buf[(row * 20 + x) * 4 + 3]);
    }

    // Count how many adjacent pairs have identical alpha (block artifact signal)
    let identicalPairs = 0;
    for (let i = 0; i < alphas.length - 1; i++) {
      if (alphas[i] === alphas[i + 1] && alphas[i] > 0) {
        identicalPairs++;
      }
    }

    // With smooth interpolation, very few adjacent pixels should be identical
    // in a gradient. Old STEP=4 block renderer would have ~75% identical pairs.
    // Allow some identical pairs (flat areas) but not block-level repetition.
    expect(identicalPairs).toBeLessThan(alphas.length * 0.5);
  });

  it("every pixel is individually rendered (no STEP x STEP constant blocks)", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    const field = new PrecipField([
      { lat: 0, lon: 0, value: 3.0, color: "#ff0000" },
      { lat: 0, lon: 1, value: 1.0, color: "#0000ff" },
      { lat: 1, lon: 0, value: 2.0, color: "#00ff00" },
      { lat: 1, lon: 1, value: 4.0, color: "#ffff00" },
    ]);

    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: pt[1] / 16,
        lng: pt[0] / 16,
      }),
    };

    const buf = field.renderToBuffer(16, 16, projector);

    // In a 4-corner gradient, each row should have varying color values.
    // Check that no 4-pixel-wide block has all identical RGBA values.
    let foundVaryingBlock = false;
    for (let y = 2; y < 14; y++) {
      for (let x = 0; x < 12; x += 4) {
        const idx0 = (y * 16 + x) * 4;
        const idx3 = (y * 16 + x + 3) * 4;
        // If first and last pixel in a 4px span differ, we have smooth rendering
        if (
          buf[idx0] !== buf[idx3] ||
          buf[idx0 + 1] !== buf[idx3 + 1] ||
          buf[idx0 + 2] !== buf[idx3 + 2]
        ) {
          foundVaryingBlock = true;
          break;
        }
      }
      if (foundVaryingBlock) break;
    }

    expect(foundVaryingBlock).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// B. Precipitation fetch uses viewport bounds (not center)
// ---------------------------------------------------------------------------
describe("Precipitation grid generation uses viewport bounds", () => {
  it("generateGridPoints covers full viewport area", async () => {
    const { generateGridPoints } = await import("@/lib/precip/precipGrid");

    const bounds = {
      west: -124,
      south: 44,
      east: -121,
      north: 47,
    };

    const points = generateGridPoints(bounds, 8);

    // Points should span the full viewport, not cluster around center
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);

    expect(Math.min(...lats)).toBeGreaterThanOrEqual(bounds.south);
    expect(Math.max(...lats)).toBeLessThanOrEqual(bounds.north);
    expect(Math.min(...lons)).toBeGreaterThanOrEqual(bounds.west);
    expect(Math.max(...lons)).toBeLessThanOrEqual(bounds.east);

    // Should have multiple distinct lat and lon values (grid, not single point)
    const uniqueLats = new Set(lats);
    const uniqueLons = new Set(lons);
    expect(uniqueLats.size).toBeGreaterThan(2);
    expect(uniqueLons.size).toBeGreaterThan(2);
  });

  it("grid points change when viewport bounds change", async () => {
    const { generateGridPoints } = await import("@/lib/precip/precipGrid");

    const bounds1 = { west: -124, south: 44, east: -121, north: 47 };
    const bounds2 = { west: -130, south: 40, east: -127, north: 43 };

    const points1 = generateGridPoints(bounds1, 8);
    const points2 = generateGridPoints(bounds2, 8);

    // Points should be different for different viewports
    const key1 = points1.map((p) => `${p.lat},${p.lon}`).join("|");
    const key2 = points2.map((p) => `${p.lat},${p.lon}`).join("|");
    expect(key1).not.toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// C. Time slider updates precipitation display
// ---------------------------------------------------------------------------
describe("PrecipField responds to hour changes", () => {
  it("different hours produce different PrecipField when data varies", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    // Simulate two hours with different precipitation values
    const samplesHour0 = [
      { lat: 0, lon: 0, value: 5.0, color: "#1f78b4" },
      { lat: 0, lon: 1, value: 5.0, color: "#1f78b4" },
      { lat: 1, lon: 0, value: 5.0, color: "#1f78b4" },
      { lat: 1, lon: 1, value: 5.0, color: "#1f78b4" },
    ];

    const samplesHour1 = [
      { lat: 0, lon: 0, value: 0.0, color: "transparent" },
      { lat: 0, lon: 1, value: 0.0, color: "transparent" },
      { lat: 1, lon: 0, value: 0.0, color: "transparent" },
      { lat: 1, lon: 1, value: 0.0, color: "transparent" },
    ];

    const field0 = new PrecipField(samplesHour0);
    const field1 = new PrecipField(samplesHour1);

    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: pt[1] / 10,
        lng: pt[0] / 10,
      }),
    };

    const buf0 = field0.renderToBuffer(10, 10, projector);
    const buf1 = field1.renderToBuffer(10, 10, projector);

    // Hour 0 should have non-zero alpha, hour 1 should be all transparent
    let hasAlphaH0 = false;
    let hasAlphaH1 = false;
    for (let i = 3; i < buf0.length; i += 4) {
      if (buf0[i] > 0) hasAlphaH0 = true;
      if (buf1[i] > 0) hasAlphaH1 = true;
    }

    expect(hasAlphaH0).toBe(true);
    expect(hasAlphaH1).toBe(false);
  });
});
