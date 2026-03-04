import { describe, it, expect, beforeEach } from "vitest";
import { resolveLocation } from "@/lib/tools/location";
import { clearCache } from "@/lib/cache";

const hasMapboxToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

describe("Location MCP Tools", () => {
  beforeEach(() => clearCache("location:"));

  describe("resolveLocation", () => {
    it("returns structured error when token is missing", async () => {
      if (hasMapboxToken) return; // skip if token is configured
      const result = await resolveLocation("Portland, OR");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toContain("token");
      expect(result.source).toBe("mapbox");
    });

    it.skipIf(!hasMapboxToken)("returns coordinates for Portland, OR", async () => {
      const result = await resolveLocation("Portland, OR");
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBeGreaterThan(0);
      const first = result.data[0];
      expect(first.coordinates.lat).toBeGreaterThan(45);
      expect(first.coordinates.lat).toBeLessThan(46);
      expect(first.coordinates.lon).toBeGreaterThan(-123);
      expect(first.coordinates.lon).toBeLessThan(-122);
    });

    it.skipIf(!hasMapboxToken)("returns non-empty placeName", async () => {
      const result = await resolveLocation("Portland, OR");
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data[0].placeName).toBeTruthy();
    });

    it.skipIf(!hasMapboxToken)("returns coordinates for zip code", async () => {
      const result = await resolveLocation("97201");
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBeGreaterThan(0);
      const coords = result.data[0].coordinates;
      expect(coords.lat).toBeGreaterThan(40);
      expect(coords.lat).toBeLessThan(50);
    });

    it.skipIf(!hasMapboxToken)("returns relevance scores", async () => {
      const result = await resolveLocation("Portland, OR");
      expect(result.success).toBe(true);
      if (!result.success) return;

      for (const r of result.data) {
        expect(r.relevance).toBeGreaterThanOrEqual(0);
        expect(r.relevance).toBeLessThanOrEqual(1);
      }
    });

    it.skipIf(!hasMapboxToken)("returns valid lat/lon ranges", async () => {
      const result = await resolveLocation("Tokyo");
      expect(result.success).toBe(true);
      if (!result.success) return;

      for (const r of result.data) {
        expect(r.coordinates.lat).toBeGreaterThanOrEqual(-90);
        expect(r.coordinates.lat).toBeLessThanOrEqual(90);
        expect(r.coordinates.lon).toBeGreaterThanOrEqual(-180);
        expect(r.coordinates.lon).toBeLessThanOrEqual(180);
      }
    });
  });
});
