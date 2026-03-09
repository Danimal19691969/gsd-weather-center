import { describe, it, expect } from "vitest";
import { cToF, fToC, mpsToMph, kmhToMph, kmToMiles, metersToFeet, formatTemp, formatWindSpeed } from "@/lib/units";

describe("Unit conversion functions", () => {
  describe("cToF", () => {
    it("converts 0°C to 32°F", () => {
      expect(cToF(0)).toBe(32);
    });

    it("converts 100°C to 212°F", () => {
      expect(cToF(100)).toBe(212);
    });

    it("converts -40°C to -40°F", () => {
      expect(cToF(-40)).toBe(-40);
    });

    it("converts 20°C to 68°F", () => {
      expect(cToF(20)).toBe(68);
    });
  });

  describe("fToC", () => {
    it("converts 32°F to 0°C", () => {
      expect(fToC(32)).toBe(0);
    });

    it("converts 212°F to 100°C", () => {
      expect(fToC(212)).toBeCloseTo(100);
    });

    it("converts -40°F to -40°C", () => {
      expect(fToC(-40)).toBeCloseTo(-40);
    });

    it("is the inverse of cToF", () => {
      expect(fToC(cToF(25))).toBeCloseTo(25);
    });
  });

  describe("kmhToMph", () => {
    it("converts km/h to mph", () => {
      expect(kmhToMph(100)).toBeCloseTo(62.1371);
    });

    it("converts 0 km/h to 0 mph", () => {
      expect(kmhToMph(0)).toBe(0);
    });
  });

  describe("mpsToMph", () => {
    it("converts m/s to mph", () => {
      expect(mpsToMph(1)).toBeCloseTo(2.237);
    });
  });

  describe("metersToFeet", () => {
    it("converts meters to feet", () => {
      expect(metersToFeet(1)).toBeCloseTo(3.28084);
    });
  });

  describe("kmToMiles", () => {
    it("converts km to miles", () => {
      expect(kmToMiles(1)).toBeCloseTo(0.621371);
    });
  });

  describe("formatTemp", () => {
    it("returns rounded Celsius with °C for metric", () => {
      expect(formatTemp(20.6, "metric")).toBe("21°C");
    });

    it("converts to Fahrenheit and appends °F for imperial", () => {
      expect(formatTemp(0, "imperial")).toBe("32°F");
    });

    it("rounds correctly", () => {
      expect(formatTemp(20.4, "metric")).toBe("20°C");
    });
  });

  describe("formatWindSpeed", () => {
    it("returns km/h value with label for metric", () => {
      expect(formatWindSpeed(15.2, "metric")).toBe("15.2 km/h");
    });

    it("converts km/h to mph with label for imperial", () => {
      const result = formatWindSpeed(100, "imperial");
      expect(result).toBe("62.1 mph");
    });
  });
});
