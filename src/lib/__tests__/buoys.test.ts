import { describe, it, expect, beforeEach } from "vitest";
import { getNearbyBuoys, getBuoyObservations, getBuoyHistory, parseNDBCText } from "@/lib/tools/buoys";
import { haversineDistance } from "@/lib/utils/distance";
import { clearCache } from "@/lib/cache";

describe("Haversine Distance", () => {
  it("returns ~102 miles from Portland to Columbia River Bar", () => {
    const d = haversineDistance(45.5, -122.6, 46.148, -124.508);
    expect(d).toBeGreaterThan(95);
    expect(d).toBeLessThan(110);
  });

  it("returns 0 for same point", () => {
    expect(haversineDistance(45.5, -122.6, 45.5, -122.6)).toBe(0);
  });

  it("returns ~3461 miles from NY to London", () => {
    const d = haversineDistance(40.7128, -74.006, 51.5074, -0.1278);
    expect(d).toBeGreaterThan(3400);
    expect(d).toBeLessThan(3500);
  });
});

describe("NDBC Parser", () => {
  const sampleText = `#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
#yr  mo dy hr mn deg  m/s  m/s     m   sec   sec deg    hPa  degC  degC  degC  nmi  hPa    ft
2026 03 04 18 00 270  5.1  6.2   1.5   8.0   5.5 280 1013.2  12.1  13.5  10.2   MM   MM    MM
2026 03 04 17 00  MM   MM   MM    MM    MM    MM  MM  999.0    MM    MM    MM   MM   MM    MM`;

  it("parses valid observations", () => {
    const obs = parseNDBCText(sampleText, "TEST01");
    expect(obs).toHaveLength(2);
    expect(obs[0].stationId).toBe("TEST01");
    expect(obs[0].windSpeed).toBe(5.1);
    expect(obs[0].waveHeight).toBe(1.5);
    expect(obs[0].waterTemp).toBe(13.5);
  });

  it("maps MM to null", () => {
    const obs = parseNDBCText(sampleText, "TEST01");
    expect(obs[0].visibility).toBeNull(); // MM
    expect(obs[1].windSpeed).toBeNull(); // MM
    expect(obs[1].windDirection).toBeNull(); // MM
  });

  it("maps sentinel values to null", () => {
    const obs = parseNDBCText(sampleText, "TEST01");
    expect(obs[1].pressure).toBeNull(); // 999.0
  });

  it("constructs correct UTC timestamp", () => {
    const obs = parseNDBCText(sampleText, "TEST01");
    expect(obs[0].timestamp).toBe("2026-03-04T18:00:00.000Z");
  });

  it("handles empty input", () => {
    expect(parseNDBCText("", "TEST01")).toHaveLength(0);
    expect(parseNDBCText("# just headers\n# nothing", "TEST01")).toHaveLength(0);
  });
});

describe("Buoy MCP Tools", () => {
  beforeEach(() => clearCache("buoy:"));

  describe("getNearbyBuoys", () => {
    it("returns buoys sorted by distance for Portland, OR", async () => {
      const result = await getNearbyBuoys(45.5, -122.6, 150);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBeGreaterThan(0);
      // Verify sorted ascending
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].distanceMiles).toBeGreaterThanOrEqual(
          result.data[i - 1].distanceMiles
        );
      }
    });

    it("all results have distanceMiles field", async () => {
      const result = await getNearbyBuoys(45.5, -122.6, 200);
      expect(result.success).toBe(true);
      if (!result.success) return;

      for (const station of result.data) {
        expect(typeof station.distanceMiles).toBe("number");
        expect(station.distanceMiles).toBeGreaterThanOrEqual(0);
      }
    });

    it("respects limit parameter", async () => {
      const result = await getNearbyBuoys(45.5, -122.6, 500, 3);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getBuoyObservations", () => {
    it("returns data for Columbia River Bar (46029)", async () => {
      const result = await getBuoyObservations("46029");
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.stationId).toBe("46029");
      expect(result.data.timestamp).toBeTruthy();
    });

    it("returns structured error for invalid station", async () => {
      const result = await getBuoyObservations("INVALID_STATION_99999");
      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.source).toBe("ndbc");
      expect(result.error).toBeTruthy();
    });
  });

  describe("getBuoyHistory", () => {
    it("returns observations for Columbia River Bar", async () => {
      const result = await getBuoyHistory("46029");
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBeGreaterThan(0);
    });

    it("all observations are within last 24 hours", async () => {
      const result = await getBuoyHistory("46029");
      expect(result.success).toBe(true);
      if (!result.success) return;

      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      for (const obs of result.data) {
        expect(new Date(obs.timestamp).getTime()).toBeGreaterThanOrEqual(twentyFourHoursAgo);
      }
    });
  });
});
