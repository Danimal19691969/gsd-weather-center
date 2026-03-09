import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// A. Precipitation type classification
// ---------------------------------------------------------------------------
describe("classifyPrecipType", () => {
  it("classifies rain when temp > 1°C and precipitation > 0", async () => {
    const { classifyPrecipType } = await import("@/lib/precip/precipClassifier");
    expect(classifyPrecipType({ temp: 5, precipitation: 2, snowfall: 0, rain: 2 })).toBe("rain");
    expect(classifyPrecipType({ temp: 15, precipitation: 0.5, snowfall: 0, rain: 0.5 })).toBe("rain");
  });

  it("classifies snow when snowfall > 0", async () => {
    const { classifyPrecipType } = await import("@/lib/precip/precipClassifier");
    expect(classifyPrecipType({ temp: -3, precipitation: 3, snowfall: 3, rain: 0 })).toBe("snow");
    expect(classifyPrecipType({ temp: -10, precipitation: 5, snowfall: 5, rain: 0 })).toBe("snow");
  });

  it("classifies snow when temp ≤ 0°C with precipitation but no rain", async () => {
    const { classifyPrecipType } = await import("@/lib/precip/precipClassifier");
    expect(classifyPrecipType({ temp: 0, precipitation: 2, snowfall: 0, rain: 0 })).toBe("snow");
    expect(classifyPrecipType({ temp: -5, precipitation: 1, snowfall: 0, rain: 0 })).toBe("snow");
  });

  it("classifies freezing rain when temp < 0 but rain detected", async () => {
    const { classifyPrecipType } = await import("@/lib/precip/precipClassifier");
    expect(classifyPrecipType({ temp: -1, precipitation: 2, snowfall: 0, rain: 2 })).toBe("freezing_rain");
    expect(classifyPrecipType({ temp: -0.5, precipitation: 1, snowfall: 0, rain: 1 })).toBe("freezing_rain");
  });

  it("classifies sleet near freezing boundary with mixed signals", async () => {
    const { classifyPrecipType } = await import("@/lib/precip/precipClassifier");
    // Temp between 0-1°C with both rain and snowfall
    expect(classifyPrecipType({ temp: 0.5, precipitation: 2, snowfall: 1, rain: 1 })).toBe("sleet");
  });

  it("returns 'none' when no precipitation", async () => {
    const { classifyPrecipType } = await import("@/lib/precip/precipClassifier");
    expect(classifyPrecipType({ temp: 20, precipitation: 0, snowfall: 0, rain: 0 })).toBe("none");
    expect(classifyPrecipType({ temp: -5, precipitation: 0, snowfall: 0, rain: 0 })).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// B. Precipitation intensity bands
// ---------------------------------------------------------------------------
describe("getPrecipIntensity", () => {
  it("returns 'none' for 0 mm/hr", async () => {
    const { getPrecipIntensity } = await import("@/lib/precip/precipIntensity");
    expect(getPrecipIntensity(0)).toBe("none");
  });

  it("returns 'light' for 0-0.5 mm/hr", async () => {
    const { getPrecipIntensity } = await import("@/lib/precip/precipIntensity");
    expect(getPrecipIntensity(0.1)).toBe("light");
    expect(getPrecipIntensity(0.5)).toBe("light");
  });

  it("returns 'moderate' for 0.5-2 mm/hr", async () => {
    const { getPrecipIntensity } = await import("@/lib/precip/precipIntensity");
    expect(getPrecipIntensity(0.6)).toBe("moderate");
    expect(getPrecipIntensity(1)).toBe("moderate");
    expect(getPrecipIntensity(2)).toBe("moderate");
  });

  it("returns 'heavy' for 2-10 mm/hr", async () => {
    const { getPrecipIntensity } = await import("@/lib/precip/precipIntensity");
    expect(getPrecipIntensity(2.1)).toBe("heavy");
    expect(getPrecipIntensity(5)).toBe("heavy");
    expect(getPrecipIntensity(10)).toBe("heavy");
  });

  it("returns 'extreme' for 10+ mm/hr", async () => {
    const { getPrecipIntensity } = await import("@/lib/precip/precipIntensity");
    expect(getPrecipIntensity(10.1)).toBe("extreme");
    expect(getPrecipIntensity(50)).toBe("extreme");
  });
});

// ---------------------------------------------------------------------------
// C. Precipitation color mapping
// ---------------------------------------------------------------------------
describe("precipToColor", () => {
  it("returns correct rain colors by intensity", async () => {
    const { precipToColor } = await import("@/lib/precip/precipColorScale");
    expect(precipToColor("rain", "light")).toBe("#a6cee3");
    expect(precipToColor("rain", "moderate")).toBe("#1f78b4");
    expect(precipToColor("rain", "heavy")).toBe("#08306b");
    expect(precipToColor("rain", "extreme")).toBe("#08306b");
  });

  it("returns correct snow colors by intensity", async () => {
    const { precipToColor } = await import("@/lib/precip/precipColorScale");
    expect(precipToColor("snow", "light")).toBe("#b2e2e2");
    expect(precipToColor("snow", "moderate")).toBe("#66c2a4");
    expect(precipToColor("snow", "heavy")).toBe("#ffffff");
    expect(precipToColor("snow", "extreme")).toBe("#ffffff");
  });

  it("returns correct sleet colors by intensity", async () => {
    const { precipToColor } = await import("@/lib/precip/precipColorScale");
    expect(precipToColor("sleet", "light")).toBe("#cbc9e2");
    expect(precipToColor("sleet", "moderate")).toBe("#9e9ac8");
    expect(precipToColor("sleet", "heavy")).toBe("#54278f");
    expect(precipToColor("sleet", "extreme")).toBe("#54278f");
  });

  it("returns correct freezing rain colors by intensity", async () => {
    const { precipToColor } = await import("@/lib/precip/precipColorScale");
    expect(precipToColor("freezing_rain", "light")).toBe("#fbb4c4");
    expect(precipToColor("freezing_rain", "moderate")).toBe("#e7298a");
    expect(precipToColor("freezing_rain", "heavy")).toBe("#7a0177");
    expect(precipToColor("freezing_rain", "extreme")).toBe("#7a0177");
  });

  it("returns transparent for 'none' type or intensity", async () => {
    const { precipToColor } = await import("@/lib/precip/precipColorScale");
    expect(precipToColor("none", "none")).toBe("transparent");
    expect(precipToColor("rain", "none")).toBe("transparent");
    expect(precipToColor("none", "light")).toBe("transparent");
  });
});

// ---------------------------------------------------------------------------
// D. PRECIP_COLOR_SCALE export structure
// ---------------------------------------------------------------------------
describe("PRECIP_COLOR_SCALE", () => {
  it("exports color scales for all 4 types", async () => {
    const { PRECIP_COLOR_SCALE } = await import("@/lib/precip/precipColorScale");
    expect(PRECIP_COLOR_SCALE).toHaveProperty("rain");
    expect(PRECIP_COLOR_SCALE).toHaveProperty("snow");
    expect(PRECIP_COLOR_SCALE).toHaveProperty("sleet");
    expect(PRECIP_COLOR_SCALE).toHaveProperty("freezing_rain");
  });

  it("each type has light, moderate, heavy entries", async () => {
    const { PRECIP_COLOR_SCALE } = await import("@/lib/precip/precipColorScale");
    for (const type of ["rain", "snow", "sleet", "freezing_rain"] as const) {
      const scale = PRECIP_COLOR_SCALE[type];
      expect(scale).toHaveProperty("light");
      expect(scale).toHaveProperty("moderate");
      expect(scale).toHaveProperty("heavy");
    }
  });
});
