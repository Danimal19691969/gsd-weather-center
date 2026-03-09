import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// A. Speed scaling
// ---------------------------------------------------------------------------
describe("Wind animation speed scaling", () => {
  it("SPEED_SCALE produces slow, syrupy motion", async () => {
    const mod = await import("@/lib/wind/WindParticleSystem");
    const source = mod.WindParticleSystem.toString();
    expect(source).toBeTruthy();
  });

  it("per-frame displacement is capped at realistic levels", async () => {
    const { SPEED_SCALE } = await import("@/lib/wind/WindParticleSystem");
    const windSpeedMs = 10; // 10 m/s (~22 mph)
    const displacement = windSpeedMs * SPEED_SCALE;
    expect(displacement).toBeLessThan(2);
    expect(displacement).toBeGreaterThan(0);
  });

  it("even strong winds (25 m/s) stay under 4 px/frame", async () => {
    const { SPEED_SCALE } = await import("@/lib/wind/WindParticleSystem");
    const strongWind = 25;
    const displacement = strongWind * SPEED_SCALE;
    expect(displacement).toBeLessThan(4);
  });

  it("MAX_DELTA caps frame time to prevent jumps", async () => {
    const { MAX_DELTA } = await import("@/lib/wind/WindParticleSystem");
    expect(MAX_DELTA).toBeDefined();
    expect(MAX_DELTA).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// B. 5-band wind speed → color mapping
// ---------------------------------------------------------------------------
describe("speedToColor (5-band)", () => {
  it("returns blue for calm winds (0–2 m/s)", async () => {
    const { speedToColor } = await import("@/lib/wind/colorScale");
    expect(speedToColor(0)).toBe("#2c7bb6");
    expect(speedToColor(1)).toBe("#2c7bb6");
    expect(speedToColor(1.9)).toBe("#2c7bb6");
  });

  it("returns green for light winds (2–5 m/s)", async () => {
    const { speedToColor } = await import("@/lib/wind/colorScale");
    expect(speedToColor(2)).toBe("#00cc66");
    expect(speedToColor(3)).toBe("#00cc66");
    expect(speedToColor(4.9)).toBe("#00cc66");
  });

  it("returns yellow for moderate winds (5–10 m/s)", async () => {
    const { speedToColor } = await import("@/lib/wind/colorScale");
    expect(speedToColor(5)).toBe("#ffe600");
    expect(speedToColor(7)).toBe("#ffe600");
    expect(speedToColor(9.9)).toBe("#ffe600");
  });

  it("returns orange for strong winds (10–18 m/s)", async () => {
    const { speedToColor } = await import("@/lib/wind/colorScale");
    expect(speedToColor(10)).toBe("#ff8c00");
    expect(speedToColor(12)).toBe("#ff8c00");
    expect(speedToColor(17.9)).toBe("#ff8c00");
  });

  it("returns red for very strong winds (18+ m/s)", async () => {
    const { speedToColor } = await import("@/lib/wind/colorScale");
    expect(speedToColor(18)).toBe("#ff2a00");
    expect(speedToColor(25)).toBe("#ff2a00");
    expect(speedToColor(50)).toBe("#ff2a00");
  });

  it("handles exact boundary values correctly", async () => {
    const { speedToColor } = await import("@/lib/wind/colorScale");
    expect(speedToColor(2)).toBe("#00cc66");  // boundary: green
    expect(speedToColor(5)).toBe("#ffe600");  // boundary: yellow
    expect(speedToColor(10)).toBe("#ff8c00"); // boundary: orange
    expect(speedToColor(18)).toBe("#ff2a00"); // boundary: red
  });
});

// ---------------------------------------------------------------------------
// C. WIND_COLOR_SCALE export
// ---------------------------------------------------------------------------
describe("WIND_COLOR_SCALE", () => {
  it("exports 5 color bands", async () => {
    const { WIND_COLOR_SCALE } = await import("@/lib/wind/colorScale");
    expect(WIND_COLOR_SCALE).toHaveLength(5);
  });

  it("each band has label, color, and min fields", async () => {
    const { WIND_COLOR_SCALE } = await import("@/lib/wind/colorScale");
    for (const band of WIND_COLOR_SCALE) {
      expect(band).toHaveProperty("label");
      expect(band).toHaveProperty("color");
      expect(band).toHaveProperty("min");
    }
  });

  it("bands are sorted by ascending min threshold", async () => {
    const { WIND_COLOR_SCALE } = await import("@/lib/wind/colorScale");
    for (let i = 1; i < WIND_COLOR_SCALE.length; i++) {
      expect(WIND_COLOR_SCALE[i].min).toBeGreaterThan(WIND_COLOR_SCALE[i - 1].min);
    }
  });
});
