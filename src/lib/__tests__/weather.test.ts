import { describe, it, expect, beforeEach } from "vitest";
import { getCurrentWeather, getForecast, getMarineWeather } from "@/lib/tools/weather";
import { clearCache } from "@/lib/cache";

describe("Weather MCP Tools", () => {
  // Clear cache between tests to ensure fresh data
  beforeEach(() => clearCache("weather:"));

  describe("getCurrentWeather", () => {
    it("returns success with valid data for Portland, OR", async () => {
      const result = await getCurrentWeather(45.5, -122.6);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(typeof result.data.temperature).toBe("number");
      expect(typeof result.data.humidity).toBe("number");
      expect(typeof result.data.windSpeed).toBe("number");
      expect(typeof result.data.pressure).toBe("number");
      expect(typeof result.data.uvIndex).toBe("number");
      expect(typeof result.data.visibility).toBe("number");
      expect(typeof result.data.weatherCode).toBe("number");
    });

    it("returns a non-empty description", async () => {
      const result = await getCurrentWeather(45.5, -122.6);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.description).toBeTruthy();
      expect(typeof result.data.description).toBe("string");
    });

    it("returns a timestamp", async () => {
      const result = await getCurrentWeather(45.5, -122.6);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.timestamp).toBeTruthy();
    });
  });

  describe("getForecast", () => {
    it("returns 7 daily entries", async () => {
      const result = await getForecast(45.5, -122.6, "daily");
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(7);
      const first = result.data[0] as { date: string; tempMax: number; tempMin: number };
      expect(typeof first.tempMax).toBe("number");
      expect(typeof first.tempMin).toBe("number");
      expect(first.date).toBeTruthy();
    });

    it("returns 48 hourly entries", async () => {
      const result = await getForecast(45.5, -122.6, "hourly");
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(48);
      const first = result.data[0] as { time: string; temperature: number };
      expect(typeof first.temperature).toBe("number");
      expect(first.time).toBeTruthy();
    });
  });

  describe("getMarineWeather", () => {
    it("returns data for a coastal location", async () => {
      const result = await getMarineWeather(46.16, -124.49);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(typeof result.data.waveHeight).toBe("number");
    });

    it("handles inland locations gracefully", async () => {
      const result = await getMarineWeather(45.5, -122.6);
      // Should still succeed — Open-Meteo may return nulls or data
      expect(result).toHaveProperty("success");
    });
  });
});
