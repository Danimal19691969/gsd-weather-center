import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// A. Weather code → icon mapping
// ---------------------------------------------------------------------------
describe("getWeatherIcon", () => {
  it("maps clear sky (code 0) to 'clear'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    const icon = getWeatherIcon({ weatherCode: 0 });
    expect(icon.iconName).toBe("clear");
  });

  it("maps partly cloudy (codes 1-3) to 'cloudy'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 1 }).iconName).toBe("cloudy");
    expect(getWeatherIcon({ weatherCode: 2 }).iconName).toBe("cloudy");
    expect(getWeatherIcon({ weatherCode: 3 }).iconName).toBe("cloudy");
  });

  it("maps fog (codes 45, 48) to 'fog'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 45 }).iconName).toBe("fog");
    expect(getWeatherIcon({ weatherCode: 48 }).iconName).toBe("fog");
  });

  it("maps drizzle (codes 51, 53, 55) to 'rain' with intensity", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 51 }).iconName).toBe("rain");
    expect(getWeatherIcon({ weatherCode: 51 }).intensity).toBe("light");
    expect(getWeatherIcon({ weatherCode: 53 }).intensity).toBe("moderate");
    expect(getWeatherIcon({ weatherCode: 55 }).intensity).toBe("heavy");
  });

  it("maps freezing drizzle (codes 56, 57) to 'freezing-rain'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 56 }).iconName).toBe("freezing-rain");
    expect(getWeatherIcon({ weatherCode: 57 }).iconName).toBe("freezing-rain");
  });

  it("maps rain (codes 61, 63, 65) to 'rain' with intensity", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 61 }).iconName).toBe("rain");
    expect(getWeatherIcon({ weatherCode: 61 }).intensity).toBe("light");
    expect(getWeatherIcon({ weatherCode: 63 }).intensity).toBe("moderate");
    expect(getWeatherIcon({ weatherCode: 65 }).intensity).toBe("heavy");
  });

  it("maps freezing rain (codes 66, 67) to 'freezing-rain'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 66 }).iconName).toBe("freezing-rain");
    expect(getWeatherIcon({ weatherCode: 67 }).iconName).toBe("freezing-rain");
  });

  it("maps snow (codes 71, 73, 75) to 'snow' with intensity", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 71 }).iconName).toBe("snow");
    expect(getWeatherIcon({ weatherCode: 71 }).intensity).toBe("light");
    expect(getWeatherIcon({ weatherCode: 73 }).intensity).toBe("moderate");
    expect(getWeatherIcon({ weatherCode: 75 }).intensity).toBe("heavy");
  });

  it("maps snow grains (code 77) to 'sleet'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 77 }).iconName).toBe("sleet");
  });

  it("maps rain showers (codes 80, 81, 82) to 'rain' with intensity", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 80 }).iconName).toBe("rain");
    expect(getWeatherIcon({ weatherCode: 80 }).intensity).toBe("light");
    expect(getWeatherIcon({ weatherCode: 81 }).intensity).toBe("moderate");
    expect(getWeatherIcon({ weatherCode: 82 }).intensity).toBe("heavy");
  });

  it("maps snow showers (codes 85, 86) to 'snow'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 85 }).iconName).toBe("snow");
    expect(getWeatherIcon({ weatherCode: 86 }).iconName).toBe("snow");
  });

  it("maps thunderstorm (codes 95, 96, 99) to 'thunderstorm'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 95 }).iconName).toBe("thunderstorm");
    expect(getWeatherIcon({ weatherCode: 96 }).iconName).toBe("thunderstorm");
    expect(getWeatherIcon({ weatherCode: 99 }).iconName).toBe("thunderstorm");
  });

  it("defaults unknown codes to 'cloudy'", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 999 }).iconName).toBe("cloudy");
  });
});

// ---------------------------------------------------------------------------
// B. Icon name list completeness
// ---------------------------------------------------------------------------
describe("ICON_NAMES", () => {
  it("exports all required icon names", async () => {
    const { ICON_NAMES } = await import("@/lib/weather/weatherIconMapper");
    const required = [
      "clear", "cloudy", "fog", "rain", "snow",
      "sleet", "freezing-rain", "thunderstorm",
    ];
    for (const name of required) {
      expect(ICON_NAMES).toContain(name);
    }
  });
});

// ---------------------------------------------------------------------------
// C. Intensity levels
// ---------------------------------------------------------------------------
describe("intensity mapping", () => {
  it("returns 'none' intensity for non-precipitation codes", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    expect(getWeatherIcon({ weatherCode: 0 }).intensity).toBe("none");
    expect(getWeatherIcon({ weatherCode: 2 }).intensity).toBe("none");
    expect(getWeatherIcon({ weatherCode: 45 }).intensity).toBe("none");
  });

  it("supports light, moderate, heavy for rain", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    const intensities = [61, 63, 65].map(
      (c) => getWeatherIcon({ weatherCode: c }).intensity
    );
    expect(intensities).toEqual(["light", "moderate", "heavy"]);
  });

  it("supports light, moderate, heavy for snow", async () => {
    const { getWeatherIcon } = await import("@/lib/weather/weatherIconMapper");
    const intensities = [71, 73, 75].map(
      (c) => getWeatherIcon({ weatherCode: c }).intensity
    );
    expect(intensities).toEqual(["light", "moderate", "heavy"]);
  });
});
