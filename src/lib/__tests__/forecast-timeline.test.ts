import { describe, it, expect } from "vitest";

describe("ForecastTimeline", () => {
  it("defaults to hour 0", async () => {
    const { createForecastTimeline } = await import("@/lib/precip/ForecastTimeline");
    const timeline = createForecastTimeline();
    expect(timeline.getCurrentHour()).toBe(0);
  });

  it("can set hour within range 0-168", async () => {
    const { createForecastTimeline } = await import("@/lib/precip/ForecastTimeline");
    const timeline = createForecastTimeline();
    timeline.setHour(48);
    expect(timeline.getCurrentHour()).toBe(48);
  });

  it("clamps hour to 0-168 range", async () => {
    const { createForecastTimeline } = await import("@/lib/precip/ForecastTimeline");
    const timeline = createForecastTimeline();
    timeline.setHour(-5);
    expect(timeline.getCurrentHour()).toBe(0);
    timeline.setHour(200);
    expect(timeline.getCurrentHour()).toBe(168);
  });

  it("advance increments by 1 hour", async () => {
    const { createForecastTimeline } = await import("@/lib/precip/ForecastTimeline");
    const timeline = createForecastTimeline();
    timeline.advance();
    expect(timeline.getCurrentHour()).toBe(1);
  });

  it("advance wraps around at 168 when loop=true", async () => {
    const { createForecastTimeline } = await import("@/lib/precip/ForecastTimeline");
    const timeline = createForecastTimeline();
    timeline.setHour(168);
    timeline.advance(true);
    expect(timeline.getCurrentHour()).toBe(0);
  });

  it("advance stops at 168 when loop=false", async () => {
    const { createForecastTimeline } = await import("@/lib/precip/ForecastTimeline");
    const timeline = createForecastTimeline();
    timeline.setHour(168);
    timeline.advance(false);
    expect(timeline.getCurrentHour()).toBe(168);
  });

  it("MAX_HOURS is 168", async () => {
    const { MAX_HOURS } = await import("@/lib/precip/ForecastTimeline");
    expect(MAX_HOURS).toBe(168);
  });
});
