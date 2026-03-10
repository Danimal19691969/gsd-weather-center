import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// A. PrecipLayer produces visible output when data exists
// ---------------------------------------------------------------------------
describe("PrecipField renders visible pixels for non-zero precipitation", () => {
  it("renderToBuffer produces non-transparent pixels for rain data", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    const field = new PrecipField([
      { lat: 44, lon: -124, value: 3.0, color: "#1f78b4" },
      { lat: 44, lon: -121, value: 2.0, color: "#a6cee3" },
      { lat: 47, lon: -124, value: 4.0, color: "#08306b" },
      { lat: 47, lon: -121, value: 1.0, color: "#a6cee3" },
    ]);

    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: 44 + (pt[1] / 100) * 3,
        lng: -124 + (pt[0] / 100) * 3,
      }),
    };

    const buf = field.renderToBuffer(100, 100, projector);

    // Count non-transparent pixels
    let visiblePixels = 0;
    for (let i = 3; i < buf.length; i += 4) {
      if (buf[i] > 0) visiblePixels++;
    }

    // With rain data covering the viewport, we expect significant visible pixels
    expect(visiblePixels).toBeGreaterThan(100);
  });

  it("draw function emits non-transparent pixels with correct color channels", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    // All cells have heavy rain (blue tones)
    const field = new PrecipField([
      { lat: 0, lon: 0, value: 8.0, color: "#08306b" },
      { lat: 0, lon: 1, value: 8.0, color: "#08306b" },
      { lat: 1, lon: 0, value: 8.0, color: "#08306b" },
      { lat: 1, lon: 1, value: 8.0, color: "#08306b" },
    ]);

    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: pt[1] / 20,
        lng: pt[0] / 20,
      }),
    };

    const buf = field.renderToBuffer(20, 20, projector);

    // Check center pixel has correct blue-dominant color
    const cx = 10;
    const cy = 10;
    const idx = (cy * 20 + cx) * 4;
    const r = buf[idx];
    const g = buf[idx + 1];
    const b = buf[idx + 2];
    const a = buf[idx + 3];

    // #08306b = R:8, G:48, B:107
    expect(a).toBeGreaterThan(0); // non-transparent
    expect(b).toBeGreaterThan(r); // blue dominant
    expect(b).toBeGreaterThan(g); // blue dominant
  });
});

// ---------------------------------------------------------------------------
// B. Precip field is non-empty for valid forecast hour
// ---------------------------------------------------------------------------
describe("PrecipField from grid cells at specific hours", () => {
  it("creates non-null field when grid has precipitation data", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    // Simulate grid cells returned from API
    const gridCells = [
      {
        lat: 44,
        lon: -124,
        hours: [
          { precipitation: 3.0, type: "rain" as const, intensity: "moderate" as const, color: "#1f78b4" },
          { precipitation: 1.0, type: "rain" as const, intensity: "light" as const, color: "#a6cee3" },
        ],
      },
      {
        lat: 44,
        lon: -121,
        hours: [
          { precipitation: 2.0, type: "rain" as const, intensity: "moderate" as const, color: "#1f78b4" },
          { precipitation: 0.0, type: "none" as const, intensity: "none" as const, color: "transparent" },
        ],
      },
      {
        lat: 47,
        lon: -124,
        hours: [
          { precipitation: 5.0, type: "rain" as const, intensity: "heavy" as const, color: "#08306b" },
          { precipitation: 0.0, type: "none" as const, intensity: "none" as const, color: "transparent" },
        ],
      },
      {
        lat: 47,
        lon: -121,
        hours: [
          { precipitation: 1.0, type: "rain" as const, intensity: "light" as const, color: "#a6cee3" },
          { precipitation: 0.5, type: "rain" as const, intensity: "light" as const, color: "#a6cee3" },
        ],
      },
    ];

    // Extract samples for hour 0
    const currentHour = 0;
    const samples = gridCells.map((cell) => {
      const h = cell.hours[currentHour];
      return {
        lat: cell.lat,
        lon: cell.lon,
        value: h.precipitation,
        color: h.color,
      };
    });

    const field = new PrecipField(samples);
    expect(field).not.toBeNull();
    expect(field.bounds.south).toBe(44);
    expect(field.bounds.north).toBe(47);
  });
});

// ---------------------------------------------------------------------------
// C. Precip responds to viewport bounds
// ---------------------------------------------------------------------------
describe("PrecipField coverage across viewport", () => {
  it("renders data across full viewport extent", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    const field = new PrecipField([
      { lat: 40, lon: -130, value: 3.0, color: "#1f78b4" },
      { lat: 40, lon: -110, value: 2.0, color: "#a6cee3" },
      { lat: 50, lon: -130, value: 4.0, color: "#08306b" },
      { lat: 50, lon: -110, value: 1.5, color: "#a6cee3" },
    ]);

    // Projector maps the full canvas to the field extent
    const projector = {
      unproject: (pt: [number, number]) => ({
        lat: 40 + (pt[1] / 200) * 10,
        lng: -130 + (pt[0] / 200) * 20,
      }),
    };

    const buf = field.renderToBuffer(200, 200, projector);

    // Check that pixels are visible in all four quadrants
    const quadrants = [
      { x: 50, y: 50 },   // top-left
      { x: 150, y: 50 },  // top-right
      { x: 50, y: 150 },  // bottom-left
      { x: 150, y: 150 }, // bottom-right
    ];

    for (const q of quadrants) {
      const idx = (q.y * 200 + q.x) * 4;
      const alpha = buf[idx + 3];
      expect(alpha).toBeGreaterThan(0);
    }
  });

  it("sample returns non-null within grid bounds after zoom", async () => {
    const { PrecipField } = await import("@/lib/precip/PrecipField");

    // Larger field simulating zoomed-out view
    const field = new PrecipField([
      { lat: 30, lon: -140, value: 2.0, color: "#1f78b4" },
      { lat: 30, lon: -100, value: 1.0, color: "#a6cee3" },
      { lat: 60, lon: -140, value: 3.0, color: "#08306b" },
      { lat: 60, lon: -100, value: 2.5, color: "#1f78b4" },
    ]);

    // Points well within the bounds
    expect(field.sample(45, -120)).not.toBeNull();
    expect(field.sample(35, -135)).not.toBeNull();
    expect(field.sample(55, -105)).not.toBeNull();

    // Points outside should be null
    expect(field.sample(29, -120)).toBeNull();
    expect(field.sample(45, -141)).toBeNull();
  });
});
